import { useState } from 'react';

interface Props {
  jobId: string;
  job: any;
}

const EXPORT_OPTIONS = [
  { id: 'original', label: 'מקורי (1080p)', format: 'mp4', quality: 'original', icon: '🎬', size: '~50MB', cost: 'חינם' },
  { id: '4k', label: '4K Ultra HD', format: 'mp4', quality: '4k', icon: '📺', size: '~200MB', cost: 'חינם' },
  { id: '720p', label: '720p (קל)', format: 'mp4', quality: '720p', icon: '📱', size: '~15MB', cost: 'חינם' },
  { id: 'vertical', label: 'אנכי (9:16)', format: 'mp4', quality: '1080p', aspect: '9:16', icon: '📲', size: '~40MB', cost: 'חינם' },
  { id: 'square', label: 'ריבועי (1:1)', format: 'mp4', quality: '1080p', aspect: '1:1', icon: '⬛', size: '~35MB', cost: 'חינם' },
  { id: 'gif', label: 'GIF (תצוגה)', format: 'gif', quality: '480p', icon: '🖼️', size: '~5MB', cost: 'חינם' },
  { id: 'webm', label: 'WebM', format: 'webm', quality: '1080p', icon: '🌐', size: '~30MB', cost: 'חינם' },
  { id: 'prores', label: 'ProRes (עריכה)', format: 'mov', quality: 'prores', icon: '🎞️', size: '~500MB', cost: 'חינם' },
];

export default function DownloadOptions({ jobId, job }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);

  async function exportVideo(opt: typeof EXPORT_OPTIONS[0]) {
    setExporting(opt.id);
    try {
      const res = await fetch(`/api/jobs/${jobId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: opt.format,
          quality: (opt as any).quality,
          aspect: (opt as any).aspect,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `video-agents-${jobId}.${opt.format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    }
    setExporting(null);
  }

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">הורדה</h3>
      <div className="grid grid-cols-4 gap-2.5">
        {EXPORT_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => exportVideo(opt)}
            disabled={exporting !== null}
            className={`p-3 rounded-xl text-center transition-all border ${
              exporting === opt.id
                ? 'bg-purple-500/20 border-purple-500/40'
                : 'bg-white/5 border-dark-border-light hover:border-gray-500'
            } ${exporting !== null && exporting !== opt.id ? 'opacity-40' : ''}`}
          >
            <div className="text-xl mb-1">{opt.icon}</div>
            <div className="text-xs font-bold text-white">{opt.label}</div>
            <div className="text-[10px] text-gray-500 mt-1">{opt.size}</div>
            <div className="text-[10px] text-green-400 mt-0.5">{opt.cost}</div>
            {exporting === opt.id && (
              <div className="text-[10px] text-purple-400 mt-1">מייצא...</div>
            )}
          </button>
        ))}
      </div>

      {/* Thumbnails */}
      {(job as any).thumbnails?.thumbnails?.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Thumbnails</h4>
          <div className="flex gap-3">
            {(job as any).thumbnails.thumbnails.map((thumb: any, i: number) => (
              <a
                key={i}
                href={`/api/jobs/${jobId}/thumbnail?platform=${thumb.platform}`}
                download
                className="flex-1 rounded-xl overflow-hidden border border-dark-border-light hover:border-gray-500 transition-colors"
              >
                <img
                  src={`/api/jobs/${jobId}/thumbnail?platform=${thumb.platform}`}
                  className="w-full block"
                  alt={thumb.platform}
                />
                <div className="p-2 text-center text-xs text-gray-400">
                  {thumb.platform}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Version selector */}
      {(job as any).versions && (job as any).versions.length > 1 && (
        <div className="text-xs text-gray-500">
          <span>גרסה: </span>
          {(job as any).versions.map((v: any) => (
            <button
              key={v.version || v.id}
              className={`px-3 py-1 mx-1 rounded text-xs border ${
                v.isActive
                  ? 'bg-purple-600 border-purple-500 text-white'
                  : 'bg-white/5 border-dark-border-light text-gray-400'
              }`}
            >
              {v.label || `v${v.versionNumber || v.version}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
