import { useState } from 'react';

interface Props {
  text: string;
}

export default function TranscriptPreview({ text }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (!text || text.trim().length === 0) return null;

  const isLong = text.length > 300;
  const displayText = expanded || !isLong ? text : text.slice(0, 300) + '...';

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-xl p-4" dir="rtl">
      <h3 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <span>📝</span> תמליל (Transcript)
      </h3>
      <div className="bg-gray-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
        <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
          {displayText}
        </p>
      </div>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-[10px] text-accent-purple-light hover:underline"
        >
          {expanded ? 'הצג פחות' : 'הצג הכל'}
        </button>
      )}
    </div>
  );
}
