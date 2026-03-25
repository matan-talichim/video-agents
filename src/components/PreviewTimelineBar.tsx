import type { PreviewTimeline } from '../types';

interface Props {
  timeline: PreviewTimeline;
}

const TYPE_COLORS: Record<string, string> = {
  original: '#3B82F6',
  broll: '#8B5CF6',
  music: '#14B8A6',
  sfx: '#F59E0B',
  subtitle: '#A78BFA',
  cta: '#F59E0B',
  'lower-third': '#8B5CF6',
};

const TYPE_LABELS: Record<string, string> = {
  original: 'מקור',
  broll: 'B-Roll',
  music: 'מוזיקה',
  sfx: 'אפקטים',
  subtitle: 'כתוביות',
  cta: 'CTA',
  'lower-third': 'שם ותפקיד',
};

export default function PreviewTimelineBar({ timeline }: Props) {
  if (!timeline.segments.length) return null;

  // Group segments by type for layered display
  const layers = timeline.segments.map(seg => ({
    ...seg,
    widthPct: ((seg.end - seg.start) / timeline.totalDuration) * 100,
    leftPct: (seg.start / timeline.totalDuration) * 100,
  }));

  // Unique segment types for legend
  const uniqueTypes = [...new Set(timeline.segments.map(s => s.type))];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">📊</span>
        ציר זמן — {timeline.totalDuration}s
      </h3>
      <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
        {/* Stacked layers */}
        <div className="space-y-1.5">
          {layers.map((seg, i) => (
            <div key={i} className="relative h-6 bg-gray-800/50 rounded overflow-hidden">
              <div
                className="absolute top-0 bottom-0 rounded flex items-center justify-center"
                style={{
                  left: `${seg.leftPct}%`,
                  width: `${Math.max(seg.widthPct, 2)}%`,
                  backgroundColor: seg.color || TYPE_COLORS[seg.type] || '#6B7280',
                  opacity: 0.85,
                }}
              >
                <span className="text-[9px] text-white font-medium truncate px-1">
                  {seg.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Time markers */}
        <div className="flex justify-between mt-2 text-[10px] text-gray-500">
          <span>0:00</span>
          <span>{formatTime(timeline.totalDuration / 4)}</span>
          <span>{formatTime(timeline.totalDuration / 2)}</span>
          <span>{formatTime(timeline.totalDuration * 3 / 4)}</span>
          <span>{formatTime(timeline.totalDuration)}</span>
        </div>

        {/* Legend */}
        <div className="flex gap-3 mt-3 flex-wrap">
          {uniqueTypes.map(type => (
            <div key={type} className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: TYPE_COLORS[type] || '#6B7280' }}
              />
              <span className="text-[10px] text-gray-400">{TYPE_LABELS[type] || type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
