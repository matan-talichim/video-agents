import type { Segment } from '../types';

interface Props {
  segments: Segment[];
  duration: number;
  currentTime?: number;
}

const SEGMENT_COLORS: Record<Segment['type'], { bg: string; label: string }> = {
  original: { bg: 'bg-blue-500', label: 'מקור' },
  broll: { bg: 'bg-purple-500', label: 'B-Roll' },
  transition: { bg: 'bg-indigo-500', label: 'מעבר' },
  text: { bg: 'bg-violet-500', label: 'טקסט' },
  sfx: { bg: 'bg-amber-500', label: 'אפקט' },
  music: { bg: 'bg-teal-500', label: 'מוזיקה' },
};

export default function TimelinePreview({ segments, duration, currentTime = 0 }: Props) {
  if (!segments.length || !duration) return null;

  const playheadPct = (currentTime / duration) * 100;

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">ציר זמן</label>
      <div className="relative bg-dark-card border border-dark-border-light rounded-xl p-3">
        {/* Timeline bar */}
        <div className="relative h-8 bg-gray-800 rounded-lg overflow-hidden flex">
          {segments.map((seg, i) => {
            const widthPct = ((seg.end - seg.start) / duration) * 100;
            const colors = SEGMENT_COLORS[seg.type] || SEGMENT_COLORS.original;
            return (
              <div
                key={i}
                className={`${colors.bg} h-full relative group`}
                style={{ width: `${widthPct}%` }}
                title={`${colors.label}: ${seg.label || ''} (${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s)`}
              >
                {widthPct > 8 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[9px] text-white/80 truncate px-1">
                    {seg.label || colors.label}
                  </span>
                )}
              </div>
            );
          })}

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white z-10 transition-all"
            style={{ left: `${playheadPct}%` }}
          >
            <div className="w-2 h-2 bg-white rounded-full -translate-x-[3px] -translate-y-0.5" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-2 flex-wrap">
          {Object.entries(SEGMENT_COLORS).map(([type, { bg, label }]) => (
            <div key={type} className="flex items-center gap-1">
              <div className={`w-2.5 h-2.5 rounded-sm ${bg}`} />
              <span className="text-[10px] text-gray-500">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
