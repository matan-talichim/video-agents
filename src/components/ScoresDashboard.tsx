interface Props {
  job: any;
}

function ScoreCard({ title, score, max, icon, detail, suffix }: {
  title: string;
  score: number;
  max: number;
  icon: string;
  detail: string;
  suffix?: string;
}) {
  const pct = (score / max) * 100;
  const color = pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = pct >= 70 ? 'text-green-400' : pct >= 50 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="p-4 rounded-xl bg-white/5">
      <div className="flex justify-between mb-2">
        <span className="text-sm text-gray-300">{icon} {title}</span>
        <span className={`font-bold ${textColor}`}>{score}{suffix || ''}/{max}</span>
      </div>
      <div className="bg-white/10 rounded h-1.5">
        <div className={`${color} rounded h-1.5`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[11px] text-gray-500 mt-1">{detail}</div>
    </div>
  );
}

export default function ScoresDashboard({ job }: Props) {
  const j = job as any;
  const hasAnyScore = j.qaResult || j.retentionPlan || j.engagementPrediction ||
    j.freshEyesReview || j.brandCompliance || j.contentSafety;

  if (!hasAnyScore) return null;

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">ציונים</h3>
      <div className="grid grid-cols-3 gap-3">
        {j.qaResult && (
          <ScoreCard
            title="בדיקת איכות"
            score={j.qaResult.overallScore}
            max={10}
            icon={j.qaResult.passed ? '✅' : '⚠️'}
            detail={`${j.qaResult.issues?.length || 0} בעיות, ${j.qaResult.autoFixes?.length || 0} תוקנו`}
          />
        )}
        {j.retentionPlan && (
          <ScoreCard
            title="שימור צופים"
            score={j.retentionPlan.predictedRetention}
            max={100}
            suffix="%"
            icon="📈"
            detail={`${j.retentionPlan.fixes?.length || 0} תיקונים הוחלו`}
          />
        )}
        {j.engagementPrediction && (
          <ScoreCard
            title="חיזוי engagement"
            score={j.engagementPrediction.overallScore}
            max={100}
            icon="🎯"
            detail={`${j.engagementPrediction.predictedEngagementRate}% צפוי`}
          />
        )}
        {j.freshEyesReview && (
          <ScoreCard
            title="עיניים רעננות"
            score={j.freshEyesReview.overallConfidence}
            max={10}
            icon={j.freshEyesReview.wouldApprove ? '✅' : '⚠️'}
            detail={`${j.freshEyesReview.improvements?.length || 0} שיפורים`}
          />
        )}
        {j.brandCompliance && (
          <ScoreCard
            title="תאימות מותג"
            score={j.brandCompliance.score}
            max={10}
            icon={j.brandCompliance.passed ? '✅' : '⚠️'}
            detail={`${j.brandCompliance.issues?.length || 0} בעיות`}
          />
        )}
        {j.contentSafety && (
          <ScoreCard
            title="בטיחות תוכן"
            score={j.contentSafety.score}
            max={10}
            icon={j.contentSafety.safe ? '✅' : '🚨'}
            detail={`${j.contentSafety.flags?.length || 0} flags`}
          />
        )}
      </div>

      {/* Presenter Quality */}
      {j.presenterQuality && (
        <div className="p-4 rounded-xl bg-white/5">
          <h4 className="text-sm font-medium text-gray-300 mb-2">איכות פרזנטור</h4>
          <div className="flex gap-5 text-sm text-gray-400">
            <span>קשר עין: {(j.presenterQuality.segmentScores?.reduce((s: number, p: any) => s + p.eyeContact, 0) / (j.presenterQuality.segmentScores?.length || 1)).toFixed(1)}/10</span>
            <span>שפת גוף: {(j.presenterQuality.segmentScores?.reduce((s: number, p: any) => s + p.bodyLanguage, 0) / (j.presenterQuality.segmentScores?.length || 1)).toFixed(1)}/10</span>
            <span>{j.presenterQuality.segmentScores?.filter((s: any) => s.recommendation === 'use').length || 0} קטעים מצוינים</span>
          </div>
        </div>
      )}

      {/* Subtitle Style */}
      {j.subtitleStylePlan && (
        <div className="p-3 rounded-xl bg-white/5 text-sm text-gray-400">
          כתוביות: {j.subtitleStylePlan.selectedStyle} — {j.subtitleStylePlan.reason}
        </div>
      )}

      {/* Cost Summary */}
      <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
        <div className="flex justify-between items-center">
          <h4 className="text-sm font-medium text-gray-300">עלות סופית</h4>
          <span className="text-2xl font-bold text-purple-400">
            ${j.totalCost?.toFixed(2) || j.costEstimate?.total?.toFixed(2) || '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
