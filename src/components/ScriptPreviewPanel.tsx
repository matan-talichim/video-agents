import type { ScriptPreview } from '../types';

interface Props {
  script: ScriptPreview[];
}

export default function ScriptPreviewPanel({ script }: Props) {
  if (!script.length) return null;

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">📝</span>
        תסריט
      </h3>
      <div className="bg-dark-card border border-dark-border-light rounded-xl divide-y divide-dark-border-light/30">
        {script.map((item, i) => (
          <div key={i} className="p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold text-accent-purple-light uppercase tracking-wider">
                {item.section}
              </span>
              <span className="text-[10px] text-gray-500 font-mono">
                {item.duration}s
              </span>
            </div>
            <p className="text-xs text-gray-200 leading-relaxed mb-1">{item.text}</p>
            <p className="text-[10px] text-gray-500 flex items-center gap-1">
              <span>🎬</span> {item.visualDescription}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
