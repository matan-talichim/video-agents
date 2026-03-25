import { useState, useEffect } from 'react';
import type { JobVersion } from '../types';

interface Props {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  fetchVersions: (jobId: string) => Promise<JobVersion[]>;
  onRevert: (jobId: string, versionId: string) => Promise<void>;
  onDownload: (url: string) => void;
}

export default function VersionHistory({
  jobId,
  isOpen,
  onClose,
  fetchVersions,
  onRevert,
  onDownload,
}: Props) {
  const [versions, setVersions] = useState<JobVersion[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchVersions(jobId).then((v) => {
        setVersions(v.sort((a, b) => b.versionNumber - a.versionNumber));
        setLoading(false);
      });
    }
  }, [isOpen, jobId, fetchVersions]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-dark-bg border-l border-dark-border-light h-full overflow-y-auto p-6 animate-slide-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">היסטוריית גרסאות</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin text-3xl mb-2">🔄</div>
            <p className="text-gray-500 text-sm">טוען גרסאות...</p>
          </div>
        ) : versions.length === 0 ? (
          <p className="text-gray-500 text-center py-12">אין גרסאות עדיין</p>
        ) : (
          <div className="space-y-4">
            {versions.map((v) => (
              <div
                key={v.id}
                className={`bg-dark-card border rounded-xl p-4 ${
                  v.isActive ? 'border-accent-purple' : 'border-dark-border-light'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">v{v.versionNumber}</span>
                    {v.isActive && (
                      <span className="text-[10px] bg-accent-purple/20 text-accent-purple-light px-2 py-0.5 rounded-full">
                        פעיל
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {new Date(v.createdAt).toLocaleString('he-IL')}
                  </span>
                </div>

                {v.prompt && (
                  <p className="text-xs text-gray-400 mb-2 line-clamp-2">{v.prompt}</p>
                )}

                {v.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {v.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Mini timeline */}
                {v.segments.length > 0 && (
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden flex mb-3">
                    {v.segments.map((seg, i) => {
                      const totalDur = v.segments.reduce((s, sg) => s + (sg.end - sg.start), 0) || 1;
                      const w = ((seg.end - seg.start) / totalDur) * 100;
                      const colors: Record<string, string> = {
                        original: 'bg-blue-500',
                        broll: 'bg-purple-500',
                        transition: 'bg-indigo-500',
                        text: 'bg-violet-500',
                        sfx: 'bg-amber-500',
                        music: 'bg-teal-500',
                      };
                      return (
                        <div key={i} className={`h-full ${colors[seg.type] || 'bg-gray-600'}`} style={{ width: `${w}%` }} />
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  {!v.isActive && (
                    <button
                      onClick={() => onRevert(jobId, v.id)}
                      className="text-xs border border-accent-purple text-accent-purple-light px-3 py-1 rounded-lg hover:bg-accent-purple/10 transition-colors"
                    >
                      שחזר
                    </button>
                  )}
                  <button
                    onClick={() => onDownload(v.videoUrl)}
                    className="text-xs border border-dark-border-light text-gray-400 px-3 py-1 rounded-lg hover:border-gray-500 transition-colors"
                  >
                    הורד
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
