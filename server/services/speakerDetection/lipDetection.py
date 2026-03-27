import sys
import json
import cv2
import numpy as np
import mediapipe as mp
import math


def _create_face_mesh():
    """Create FaceMesh using legacy solutions API (mediapipe<=0.10.14)
    or new tasks API (mediapipe>=0.10.33)."""
    # Try legacy API first (mp.solutions.face_mesh)
    try:
        mp_face_mesh = mp.solutions.face_mesh
        return mp_face_mesh.FaceMesh(
            static_image_mode=False,
            max_num_faces=3,
            refine_landmarks=True,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        ), 'legacy'
    except AttributeError:
        pass

    # New tasks API (mediapipe>=0.10.33)
    import os
    import urllib.request

    model_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'face_landmarker.task')
    if not os.path.exists(model_path):
        url = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
        urllib.request.urlretrieve(url, model_path)

    base_options = mp.tasks.BaseOptions(model_asset_path=model_path)
    options = mp.tasks.vision.FaceLandmarkerOptions(
        base_options=base_options,
        running_mode=mp.tasks.vision.RunningMode.VIDEO,
        num_faces=3,
        min_face_detection_confidence=0.5,
        min_face_presence_confidence=0.5,
        min_tracking_confidence=0.5,
        output_face_blendshapes=False,
        output_facial_transformation_matrixes=False,
    )
    landmarker = mp.tasks.vision.FaceLandmarker.create_from_options(options)
    return landmarker, 'tasks'


class _TasksAPIWrapper:
    """Wraps the new tasks API to match the legacy FaceMesh interface."""

    def __init__(self, landmarker):
        self._landmarker = landmarker
        self._timestamp_ms = 0

    def process(self, rgb_frame):
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
        self._timestamp_ms += 33  # ~30fps increment
        result = self._landmarker.detect_for_video(mp_image, self._timestamp_ms)
        return _TasksResult(result, rgb_frame.shape)

    def close(self):
        self._landmarker.close()


class _TasksResult:
    """Adapts tasks API result to look like legacy FaceMesh result."""

    def __init__(self, result, frame_shape):
        self.multi_face_landmarks = None
        if result.face_landmarks:
            self.multi_face_landmarks = []
            for face in result.face_landmarks:
                self.multi_face_landmarks.append(_LandmarkList(face, frame_shape))


class _LandmarkList:
    """Adapts normalized landmarks from tasks API."""

    def __init__(self, landmarks, frame_shape):
        self.landmark = [_Landmark(lm) for lm in landmarks]


class _Landmark:
    def __init__(self, lm):
        self.x = lm.x
        self.y = lm.y
        self.z = lm.z


def analyze_lip_motion(video_path: str, speech_segments: list, fps: int = 10) -> list:
    """
    For each speech segment, analyze lip motion at 10 FPS using MediaPipe Face Mesh.
    Returns timestamps where the presenter's lips are actually moving (Tvisual).

    Key insight:
    - Lip distance changes = speaking
    - Whole face moves but lip distance stable = body movement, NOT speaking
    - Smile = lip corners move but vertical distance stays small
    """

    detector, api_mode = _create_face_mesh()
    if api_mode == 'tasks':
        face_mesh = _TasksAPIWrapper(detector)
    else:
        face_mesh = detector

    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_interval = max(1, int(video_fps / fps))  # Sample at 10 FPS

    # UPPER LIP landmark index: 13 (center of upper lip)
    # LOWER LIP landmark index: 14 (center of lower lip)
    # Additional lip landmarks for better accuracy:
    # 61 (left corner), 291 (right corner), 0 (top of upper lip), 17 (bottom of lower lip)
    UPPER_LIP = 13
    LOWER_LIP = 14
    UPPER_LIP_TOP = 0
    LOWER_LIP_BOTTOM = 17
    LEFT_CORNER = 61
    RIGHT_CORNER = 291

    # Also track nose tip (1) to detect whole-face movement
    NOSE_TIP = 1

    visual_speech_segments = []

    for seg in speech_segments:
        start_frame = int(seg['start'] * video_fps)
        end_frame = int(seg['end'] * video_fps)

        lip_distances = []
        nose_positions = []
        frame_times = []

        cap.set(cv2.CAP_PROP_POS_FRAMES, start_frame)

        frame_num = start_frame
        while frame_num <= end_frame:
            ret, frame = cap.read()
            if not ret:
                break

            # Only process every Nth frame (10 FPS)
            if (frame_num - start_frame) % frame_interval != 0:
                frame_num += 1
                continue

            current_time = frame_num / video_fps

            # Convert to RGB for MediaPipe
            rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = face_mesh.process(rgb_frame)

            if results.multi_face_landmarks:
                # Find the LARGEST face (= presenter, closest to camera)
                largest_face = None
                largest_area = 0

                for face_landmarks in results.multi_face_landmarks:
                    # Calculate face bounding box area
                    xs = [lm.x for lm in face_landmarks.landmark]
                    ys = [lm.y for lm in face_landmarks.landmark]
                    area = (max(xs) - min(xs)) * (max(ys) - min(ys))

                    if area > largest_area:
                        largest_area = area
                        largest_face = face_landmarks

                if largest_face:
                    h, w = frame.shape[:2]

                    # Get lip landmark positions
                    upper = largest_face.landmark[UPPER_LIP]
                    lower = largest_face.landmark[LOWER_LIP]
                    upper_top = largest_face.landmark[UPPER_LIP_TOP]
                    lower_bottom = largest_face.landmark[LOWER_LIP_BOTTOM]
                    nose = largest_face.landmark[NOSE_TIP]

                    # Calculate vertical lip distance (pixels)
                    lip_dist = math.sqrt(
                        ((upper.x - lower.x) * w) ** 2 +
                        ((upper.y - lower.y) * h) ** 2
                    )

                    # Also calculate full mouth opening (top to bottom)
                    full_mouth_dist = math.sqrt(
                        ((upper_top.x - lower_bottom.x) * w) ** 2 +
                        ((upper_top.y - lower_bottom.y) * h) ** 2
                    )

                    lip_distances.append({
                        'time': current_time,
                        'lip_dist': lip_dist,
                        'full_mouth_dist': full_mouth_dist,
                    })

                    # Track nose position for body-movement filtering
                    nose_positions.append({
                        'time': current_time,
                        'x': nose.x * w,
                        'y': nose.y * h,
                    })

                    frame_times.append(current_time)

            frame_num += 1

        if len(lip_distances) < 2:
            continue

        # === ANALYSIS: Determine speaking vs not speaking ===

        # Calculate lip distance CHANGES between consecutive frames
        lip_changes = []
        nose_changes = []

        for i in range(1, len(lip_distances)):
            lip_delta = abs(lip_distances[i]['lip_dist'] - lip_distances[i-1]['lip_dist'])
            mouth_delta = abs(lip_distances[i]['full_mouth_dist'] - lip_distances[i-1]['full_mouth_dist'])

            # Nose movement (whole face/body movement)
            nose_dx = abs(nose_positions[i]['x'] - nose_positions[i-1]['x'])
            nose_dy = abs(nose_positions[i]['y'] - nose_positions[i-1]['y'])
            nose_delta = math.sqrt(nose_dx**2 + nose_dy**2)

            lip_changes.append({
                'time': lip_distances[i]['time'],
                'lip_delta': lip_delta,
                'mouth_delta': mouth_delta,
                'nose_delta': nose_delta,
            })

        if not lip_changes:
            continue

        # Thresholds (calibrated for 480p video)
        # Lip movement > 2px between frames = likely speaking
        # But only if nose movement is NOT proportionally large (body movement filter)
        LIP_THRESHOLD = 2.0        # pixels of lip change to count as "speaking"
        BODY_MOVE_RATIO = 0.5      # if nose moves MORE than 2x lip -> body movement, not speech

        # Determine speaking windows
        speaking_frames = []

        for lc in lip_changes:
            is_lip_moving = lc['lip_delta'] > LIP_THRESHOLD or lc['mouth_delta'] > LIP_THRESHOLD * 1.5
            is_body_moving = lc['nose_delta'] > lc['lip_delta'] * (1 / BODY_MOVE_RATIO) if lc['lip_delta'] > 0 else False

            # Speaking = lips moving AND it's not just body movement
            is_speaking = is_lip_moving and not is_body_moving

            speaking_frames.append({
                'time': lc['time'],
                'speaking': is_speaking,
                'lip_delta': lc['lip_delta'],
                'nose_delta': lc['nose_delta'],
            })

        # Merge consecutive speaking frames into segments
        # with 0.3s tolerance (small pauses between words)
        current_start = None
        last_speaking_time = None
        MERGE_GAP = 0.3  # seconds

        for sf in speaking_frames:
            if sf['speaking']:
                if current_start is None:
                    current_start = sf['time']
                last_speaking_time = sf['time']
            else:
                if current_start is not None:
                    # Check if gap is small enough to merge
                    if sf['time'] - last_speaking_time > MERGE_GAP:
                        visual_speech_segments.append({
                            'start': round(current_start, 3),
                            'end': round(last_speaking_time + 0.1, 3),  # +0.1s buffer
                        })
                        current_start = None

        # Don't forget the last segment
        if current_start is not None and last_speaking_time is not None:
            visual_speech_segments.append({
                'start': round(current_start, 3),
                'end': round(last_speaking_time + 0.1, 3),
            })

    cap.release()
    face_mesh.close()

    return visual_speech_segments


if __name__ == '__main__':
    video_path = sys.argv[1]
    speech_segments_json = sys.argv[2]
    speech_segments = json.loads(speech_segments_json)

    result = analyze_lip_motion(video_path, speech_segments)
    print(json.dumps(result))
