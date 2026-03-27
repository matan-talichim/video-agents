import type { BRollPreviewItem } from '../types';

interface Props {
  prompts: BRollPreviewItem[];
  pricePerClip?: number;
}

export default function BRollPreview({ prompts, pricePerClip }: Props) {
  if (!prompts.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-1 flex items-center gap-2">
        <span className="text-lg">🎞️</span>
        קליפים מקוריים ({prompts.length})
      </h3>
      <p className="text-[11px] text-gray-500 mb-3">
        קליפים שייווצרו ב-AI ויוכנסו ברגעים המתאימים
      </p>
      <div className="space-y-2">
        {prompts.map((item, i) => (
          <div
            key={i}
            className="bg-dark-card border border-dark-border-light rounded-xl p-3 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex-shrink-0 text-xs font-mono text-accent-purple-light">
                🎞️ שנייה {Math.round(item.timestamp)}
              </div>
              <span className="text-gray-600">|</span>
              <span className="text-xs text-gray-200 truncate">
                {item.userDescription || item.reason || 'קליפ AI'}
              </span>
              {item.triggerWord && (
                <span className="text-[11px] text-gray-500 flex-shrink-0">
                  (כשנאמר: &quot;{item.triggerWord}&quot;)
                </span>
              )}
            </div>
            {pricePerClip != null && (
              <span className="text-amber-400 font-mono text-xs font-bold flex-shrink-0">
                ${pricePerClip.toFixed(2)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
