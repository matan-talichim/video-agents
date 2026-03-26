import { useState, useEffect } from 'react';

interface QAIssue {
  type: string;
  timestamp: number;
  severity: 'critical' | 'warning' | 'minor';
  description: string;
  autoFixable: boolean;
}

interface QAResult {
  passed: boolean;
  overallScore: number;
  issues: QAIssue[];
  autoFixes: Array<{ issue: string; fix: string; timestamp: number }>;
  warnings: string[];
}

interface QABadgeProps {
  jobId: string;
}

export default function QABadge({ jobId }: QABadgeProps) {
  const [qa, setQa] = useState<QAResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/qa`)
      .then(res => res.json())
      .then(data => {
        if (data.overallScore !== undefined) setQa(data);
      })
      .catch(() => {});
  }, [jobId]);

  if (!qa || qa.issues.length === 0) return null;

  const score = qa.overallScore;
  let icon: string;
  let label: string;
  let colorClass: string;

  if (score >= 8) {
    icon = '\u2705';
    label = `בדיקת איכות: עבר (${score.toFixed(1)}/10)`;
    colorClass = 'text-green-400 bg-green-400/10 border-green-400/30';
  } else if (score >= 6) {
    icon = '\u26A0\uFE0F';
    label = `בדיקת איכות: עבר עם הערות (${score.toFixed(1)}/10)`;
    colorClass = 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
  } else {
    icon = '\u274C';
    label = `בדיקת איכות: נמצאו בעיות (${score.toFixed(1)}/10)`;
    colorClass = 'text-red-400 bg-red-400/10 border-red-400/30';
  }

  return (
    <div className={`rounded-xl border p-3 ${colorClass}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-sm font-medium"
      >
        <span>{icon} {label}</span>
        {qa.autoFixes.length > 0 && (
          <span className="text-xs opacity-75">
            {qa.autoFixes.length} תיקונים אוטומטיים
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-xs" dir="rtl">
          {qa.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 opacity-80">
              <span className="mt-0.5 shrink-0">
                {qa.issues[i]?.severity === 'critical' ? '\u274C' : '\u26A0\uFE0F'}
              </span>
              <span>{w}</span>
            </div>
          ))}
          {qa.autoFixes.length > 0 && (
            <div className="pt-2 border-t border-current/20">
              <span className="font-medium">תיקונים אוטומטיים:</span>
              {qa.autoFixes.map((fix, i) => (
                <div key={i} className="flex items-start gap-2 mt-1 opacity-80">
                  <span className="mt-0.5 shrink-0">\u2705</span>
                  <span>{fix.fix}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
