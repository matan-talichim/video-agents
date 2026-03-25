import type { BRollPreviewItem } from '../types';

interface Props {
  prompts: BRollPreviewItem[];
}

export default function BRollPreview({ prompts }: Props) {
  if (!prompts.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">🎥</span>
        B-Roll שייווצר
      </h3>
      <div className="bg-dark-card border border-dark-border-light rounded-xl divide-y divide-dark-border-light/30">
        {prompts.map((item, i) => (
          <div key={i} className="p-3 flex gap-3">
            <div className="flex-shrink-0 w-12 text-center">
              <div className="text-xs font-mono text-accent-purple-light">
                {formatTime(item.timestamp)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">
                {item.duration}s
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-200 leading-relaxed">{item.prompt}</p>
              <p className="text-[10px] text-gray-500 mt-1">{item.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
