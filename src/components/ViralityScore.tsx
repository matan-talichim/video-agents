import { useState } from 'react';
import type { ViralityScore as ViralityScoreType } from '../types';

interface Props {
  score: ViralityScoreType;
}

function scoreBg(score: number): string {
  if (score >= 70) return 'from-green-600 to-green-700';
  if (score >= 40) return 'from-amber-600 to-amber-700';
  return 'from-red-600 to-red-700';
}

const SUB_SCORES: { key: keyof Omit<ViralityScoreType, 'overall' | 'tips'>; label: string; color: string }[] = [
  { key: 'hook', label: 'הוק פתיחה', color: 'bg-blue-500' },
  { key: 'pacing', label: 'קצב', color: 'bg-purple-500' },
  { key: 'visual', label: 'ויזואלי', color: 'bg-pink-500' },
  { key: 'audio', label: 'אודיו', color: 'bg-cyan-500' },
  { key: 'cta', label: 'קריאה לפעולה', color: 'bg-amber-500' },
];

export default function ViralityScore({ score }: Props) {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5">
      <div className="flex items-center gap-4 mb-4">
        <div
          className={`w-16 h-16 rounded-xl bg-gradient-to-br ${scoreBg(score.overall)} flex items-center justify-center`}
        >
          <span className="text-2xl font-extrabold">{score.overall}</span>
        </div>
        <div>
          <h3 className="font-bold">ציון ויראליות</h3>
          <p className="text-xs text-gray-400">
            {score.overall >= 70 ? 'פוטנציאל גבוה!' : score.overall >= 40 ? 'יש מקום לשיפור' : 'צריך עבודה'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {SUB_SCORES.map((sub) => (
          <div key={sub.key} className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-20 flex-shrink-0">{sub.label}</span>
            <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${sub.color} rounded-full transition-all`}
                style={{ width: `${score[sub.key]}%` }}
              />
            </div>
            <span className="text-xs font-mono text-gray-500 w-8 text-left">{score[sub.key]}</span>
          </div>
        ))}
      </div>

      {score.tips.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowTips(!showTips)}
            className="text-xs text-accent-purple-light hover:underline"
          >
            {showTips ? 'הסתר טיפים' : `${score.tips.length} טיפים לשיפור`}
          </button>
          {showTips && (
            <ul className="mt-2 space-y-1">
              {score.tips.map((tip, i) => (
                <li key={i} className="text-xs text-gray-400 flex gap-2">
                  <span className="text-accent-purple-light">💡</span>
                  {tip}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
