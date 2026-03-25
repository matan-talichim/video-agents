import { useState, useRef } from 'react';

interface Props {
  videoUrl?: string;
  versionNumber?: number;
}

export default function VideoPlayer({ videoUrl, versionNumber = 1 }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

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

  return (
    <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
          onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
          onEnded={() => setPlaying(false)}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-dark-card to-dark-bg">
          <span className="text-6xl mb-4">🎬</span>
          <p className="text-gray-500">תצוגה מקדימה</p>
        </div>
      )}

      {/* Version badge */}
      <div className="absolute top-3 left-3 bg-accent-purple/80 backdrop-blur-sm text-xs px-2.5 py-1 rounded-lg font-medium">
        v{versionNumber}
      </div>

      {/* Play overlay */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors group"
      >
        {!playing && videoUrl && (
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
            <div className="w-0 h-0 border-t-8 border-b-8 border-r-0 border-l-12 border-transparent border-l-white mr-[-2px]" />
          </div>
        )}
      </button>

      {/* Time display */}
      {videoUrl && (
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-xs px-2 py-1 rounded font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      )}
    </div>
  );
}
