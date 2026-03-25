import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import ProgressTimeline from '../components/ProgressTimeline';
import FeatureList from '../components/FeatureList';

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!id) return;

    // Initial fetch
    fetchJob(id);

    // Poll every 2 seconds
    intervalRef.current = setInterval(() => {
      fetchJob(id);
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, fetchJob]);

  // Redirect based on status
  useEffect(() => {
    if (!currentJob) return;

    // If job is in preview status, redirect to preview page
    if (currentJob.status === 'preview' || (currentJob.status === 'planning' && !currentJob.approvedAt)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate(`/jobs/${id}/preview`, { replace: true });
      return;
    }

    if (currentJob.status === 'done') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const timer = setTimeout(() => {
        navigate(`/jobs/${id}/result`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentJob?.status, currentJob?.approvedAt, id, navigate]);

  if (!currentJob && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🔄</div>
          <p className="text-gray-400">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-400 mb-2">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-accent-purple-light text-sm hover:underline"
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  const job = currentJob!;
  const progress = job.progress || 0;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border-light/30">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-bold">{job.projectName || 'עיבוד סרטון'}</h1>
          <span className="text-xs text-gray-500">{job.id.slice(0, 8)}</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 mt-8 space-y-8">
        {/* Overall Progress */}
        <div className="text-center">
          {job.status === 'error' ? (
            <>
              <div className="text-5xl mb-3">❌</div>
              <h2 className="text-xl font-bold text-red-400 mb-1">שגיאה בעיבוד</h2>
              <p className="text-sm text-gray-400">{job.error || 'אירעה שגיאה לא צפויה'}</p>
            </>
          ) : job.status === 'done' ? (
            <>
              <div className="text-5xl mb-3">✅</div>
              <h2 className="text-xl font-bold mb-1">הסרטון מוכן!</h2>
              <p className="text-sm text-gray-400">מעביר לדף התוצאה...</p>
            </>
          ) : (
            <>
              <div className="text-5xl mb-3 animate-pulse">🧠</div>
              <h2 className="text-xl font-bold mb-1">
                {job.status === 'planning' ? 'המוח מתכנן...' : 'מעבד את הסרטון...'}
              </h2>
              <p className="text-sm text-gray-400 mb-4">
                {job.currentStep || 'מתחיל...'}
              </p>
            </>
          )}

          {/* Progress Bar */}
          <div className="relative mt-4">
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #6d28d9, #3b82f6, #7c3aed)',
                  backgroundSize: '200% 100%',
                  animation: 'gradient-shift 2s linear infinite',
                }}
              />
            </div>
            <p className="text-2xl font-bold mt-3 font-mono">{progress}%</p>
          </div>
        </div>

        {/* Features selected */}
        {job.plan && (
          <FeatureList
            enabledFeatures={job.plan.enabledFeatures}
            costEstimate={(job as unknown as Record<string, unknown>).costEstimate as { total: number; breakdown: Record<string, number> } | undefined}
          />
        )}

        {/* Virality Score */}
        {job.result?.viralityScore && (
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">📊</span>
              ציון ויראליות
            </h3>
            <div className="flex items-center gap-4 mb-3">
              <div className={`text-3xl font-bold font-mono ${
                job.result.viralityScore.overall >= 80 ? 'text-green-400' :
                job.result.viralityScore.overall >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {job.result.viralityScore.overall}
              </div>
              <div className="flex-1">
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${job.result.viralityScore.overall}%`,
                      background: job.result.viralityScore.overall >= 80
                        ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                        : job.result.viralityScore.overall >= 60
                        ? 'linear-gradient(90deg, #eab308, #facc15)'
                        : 'linear-gradient(90deg, #ef4444, #f87171)',
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[
                { label: 'הוק', value: job.result.viralityScore.hook },
                { label: 'קצב', value: job.result.viralityScore.pacing },
                { label: 'ויזואל', value: job.result.viralityScore.visual },
                { label: 'אודיו', value: job.result.viralityScore.audio },
                { label: 'CTA', value: job.result.viralityScore.cta },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-xs text-gray-500 mb-1">{item.label}</div>
                  <div className="text-sm font-mono font-bold text-gray-300">{item.value}/10</div>
                </div>
              ))}
            </div>
            {job.result.viralityScore.tips.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">טיפים לשיפור:</p>
                {job.result.viralityScore.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-gray-400 pr-3">• {tip}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step Timeline */}
        {job.steps.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">שלבי עיבוד</h3>
            <ProgressTimeline steps={job.steps} currentStep={job.currentStep} />
          </div>
        )}

        {/* Brain reasoning */}
        {job.plan?.reasoning && (
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h3 className="text-xs text-gray-500 mb-2">🧠 החלטת המוח</h3>
            <p className="text-sm text-gray-400 leading-relaxed">{job.plan.reasoning}</p>
          </div>
        )}
      </div>

      {/* Animated gradient keyframe */}
      <style>{`
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
}
