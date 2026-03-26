import { useState, useEffect } from 'react';

interface RetentionPoint {
  timestamp: number;
  predictedRetention: number;
  risk: 'low' | 'medium' | 'high';
  reason: string;
}

interface RetentionFix {
  timestamp: number;
  type: string;
  reason: string;
}

interface RetentionPlan {
  predictions: RetentionPoint[];
  fixes: RetentionFix[];
  predictedRetention: number;
}

const FIX_TYPE_LABELS: Record<string, string> = {
  'add-zoom': 'זום הוסף',
  'add-broll': 'B-Roll הוסף',
  'add-sfx': 'SFX הוסף',
  'speed-up': 'הואץ',
  'add-text': 'טקסט הוסף',
  'add-music-change': 'שינוי מוזיקה',
};

interface RetentionCurveProps {
  jobId: string;
}

export default function RetentionCurve({ jobId }: RetentionCurveProps) {
  const [retention, setRetention] = useState<RetentionPlan | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/jobs/${jobId}/retention`)
      .then(res => res.json())
      .then(data => {
        if (data.predictions && data.predictions.length > 0) setRetention(data);
      })
      .catch(() => {});
  }, [jobId]);

  if (!retention || retention.predictions.length === 0) return null;

  const predicted = retention.predictedRetention;
  const platformAvg = 45;
  const aboveAvg = predicted > platformAvg;

  // Build a simple bar chart from predictions
  const maxTimestamp = Math.max(...retention.predictions.map(p => p.timestamp));

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <h3 className="text-base font-semibold text-white">
          תחזית שימור צופים
        </h3>
        <span className="text-xs text-gray-400">
          {expanded ? 'סגור' : 'הרחב'}
        </span>
      </button>

      {/* Summary line */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-white font-medium">
          שימור צפוי: {predicted}%
        </span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-400">
          ממוצע בפלטפורמה: {platformAvg}%
        </span>
        {aboveAvg && (
          <span className="text-green-400 text-xs">
            מעל הממוצע!
          </span>
        )}
      </div>

      {expanded && (
        <>
          {/* Visual retention curve */}
          <div className="space-y-1">
            {retention.predictions.map((point, i) => {
              const barWidth = Math.max(5, point.predictedRetention);
              const riskColor = point.risk === 'high'
                ? 'bg-red-500'
                : point.risk === 'medium'
                  ? 'bg-yellow-500'
                  : 'bg-green-500';

              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500 w-10 text-left shrink-0">
                    {point.timestamp}s
                  </span>
                  <div className="flex-1 h-4 bg-dark-bg rounded-sm overflow-hidden">
                    <div
                      className={`h-full ${riskColor} rounded-sm transition-all`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <span className="text-gray-400 w-10 text-right shrink-0">
                    {point.predictedRetention}%
                  </span>
                </div>
              );
            })}
          </div>

          {/* Retention fixes applied */}
          {retention.fixes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-dark-border-light/50">
              <p className="text-xs text-gray-400 font-medium">
                {retention.fixes.length} תיקוני שימור הוחלו אוטומטית:
              </p>
              {retention.fixes.map((fix, i) => (
                <div key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="shrink-0 text-purple-400">{fix.timestamp}s</span>
                  <span>—</span>
                  <span>
                    {FIX_TYPE_LABELS[fix.type] || fix.type}
                    {fix.reason ? ` (${fix.reason})` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
