import React, { useState, useRef } from 'react';

interface Props {
  videoUrl?: string;
  versionNumber?: number;
  onError?: (message: string) => void;
}

export default function VideoPlayer({ videoUrl, versionNumber = 1, onError }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    const mediaError = video.error;
    const errorDetail = mediaError
      ? `code=${mediaError.code} ${mediaError.message || ''}`
      : 'unknown';
    console.error('[VideoPlayer] Load error:', errorDetail, 'src:', videoUrl);
    setHasError(true);
    onError?.('שגיאה בטעינת הסרטון — ייתכן שהעריכה עדיין בתהליך');
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    // Unmute after autoplay starts (browsers require muted for autoplay)
    video.muted = false;
  };

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
      {videoUrl && !hasError ? (
        <video
          key={videoUrl}
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          muted
          playsInline
          loop
          className="w-full h-full object-contain"
          style={{ maxHeight: '80vh' }}
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setPlaying(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={handleVideoError}
        >
          הדפדפן שלך לא תומך בנגן וידאו
        </video>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-dark-card to-dark-bg">
          <span className="text-6xl mb-4">{hasError ? '⚠️' : '🎬'}</span>
          <p className="text-gray-500">
            {hasError ? 'לא ניתן לטעון את הסרטון' : 'תצוגה מקדימה'}
          </p>
          {hasError && videoUrl && (
            <button
              onClick={() => { setHasError(false); }}
              className="mt-3 text-sm text-purple-400 hover:text-purple-300 underline"
            >
              נסה שוב
            </button>
          )}
        </div>
      )}

      {/* Version badge */}
      <div className="absolute top-3 left-3 bg-accent-purple/80 backdrop-blur-sm text-xs px-2.5 py-1 rounded-lg font-medium">
        v{versionNumber}
      </div>

      {/* Play overlay — only show when controls are not native */}
      {!playing && videoUrl && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <div className="w-0 h-0 border-t-8 border-b-8 border-r-0 border-l-12 border-transparent border-l-white mr-[-2px]" />
          </div>
        </button>
      )}

      {/* Time display */}
      {videoUrl && !hasError && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-xs px-2 py-1 rounded font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}
    </div>
  );
}
