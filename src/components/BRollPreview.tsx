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
        {prompts.map((item: any, i: number) => (
          <div
            key={i}
            className="bg-dark-card border border-dark-border-light rounded-xl p-3.5 space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-accent-purple-light font-bold">
                🎞️ שנייה {Math.round(item.timestamp)}
              </span>
              {pricePerClip != null && (
                <span className="text-amber-400 font-mono text-xs font-bold">
                  ${pricePerClip.toFixed(2)}
                </span>
              )}
            </div>
            {(item.triggerSentence || item.triggerWord) && (
              <div className="text-[13px] text-gray-400">
                💬 <span className="italic">&quot;{item.triggerSentence || item.triggerWord}&quot;</span>
              </div>
            )}
            <div className="text-sm text-gray-200">
              🎬 {item.userDescription || item.reason || 'קליפ AI'}
            </div>
            {item.reason && item.userDescription && (
              <div className="text-[12px] text-gray-500">
                {item.reason}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
