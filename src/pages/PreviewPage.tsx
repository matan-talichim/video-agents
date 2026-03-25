import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import StoryboardGrid from '../components/StoryboardGrid';
import PreviewTimelineBar from '../components/PreviewTimelineBar';
import EstimatesCard from '../components/EstimatesCard';
import BRollPreview from '../components/BRollPreview';
import ScriptPreviewPanel from '../components/ScriptPreviewPanel';
import PreviewChat from '../components/PreviewChat';
import ApproveButton from '../components/ApproveButton';

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, approvePreview, requestPreviewChange, undoPreviewChange, isLoading, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [changeHistory, setChangeHistory] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  useEffect(() => {
    if (!id) return;

    fetchJob(id);

    // Poll every 2 seconds while planning
    intervalRef.current = setInterval(() => {
      fetchJob(id);
    }, 2000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, fetchJob]);

  // Stop polling when preview is ready, redirect when processing/done
  useEffect(() => {
    if (!currentJob) return;

    if (currentJob.status === 'preview') {
      // Preview is ready — stop polling
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    if (currentJob.status === 'approved' || currentJob.status === 'processing') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate(`/jobs/${id}`);
    }

    if (currentJob.status === 'done') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate(`/jobs/${id}/result`);
    }
  }, [currentJob?.status, id, navigate]);

  const handleApprove = useCallback(async () => {
    if (!id || isApproving) return;
    setIsApproving(true);
    try {
      await approvePreview(id);
      navigate(`/jobs/${id}`);
    } catch {
      setIsApproving(false);
    }
  }, [id, approvePreview, navigate, isApproving]);

  const handleChange = useCallback(async (message: string) => {
    if (!id || isChanging) return;
    setIsChanging(true);

    // Start polling again while change is processing
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        fetchJob(id);
      }, 2000);
    }

    try {
      const newPreview = await requestPreviewChange(id, message);
      if (newPreview) {
        setChangeHistory(prev => [...prev, message]);
        fetchJob(id);
      }
    } finally {
      setIsChanging(false);
      // Stop polling after change completes
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [id, requestPreviewChange, fetchJob, isChanging]);

  const handleUndo = useCallback(async () => {
    if (!id) return;
    const prev = await undoPreviewChange(id);
    if (prev) {
      setChangeHistory(h => h.slice(0, -1));
      fetchJob(id);
    }
  }, [id, undoPreviewChange, fetchJob]);

  // Loading state
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

  // Error state
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

  // Planning/generating preview — show loading
  if (job.status === 'pending' || job.status === 'planning') {
    return (
      <div className="min-h-screen bg-dark-bg">
        <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border-light/30">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="text-gray-400 hover:text-white transition-colors text-sm"
            >
              → חזרה
            </button>
            <h1 className="text-lg font-bold">{job.projectName || 'תצוגה מקדימה'}</h1>
            <span className="text-xs text-gray-500">{job.id.slice(0, 8)}</span>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 mt-16">
          <div className="text-center">
            <div className="text-5xl mb-4 animate-pulse">🧠</div>
            <h2 className="text-xl font-bold mb-2">
              {job.status === 'planning' ? 'מכין תצוגה מקדימה...' : 'ממתין...'}
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {job.currentStep || 'המוח מנתח את הפרומפט ומחליט אילו פיצ׳רים להפעיל'}
            </p>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden max-w-xs mx-auto">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${job.progress || 5}%`,
                  background: 'linear-gradient(90deg, #7c3aed, #3b82f6)',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Preview ready
  const preview = job.previewData;
  if (!preview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">ממתין לתצוגה מקדימה...</p>
        </div>
      </div>
    );
  }

  const canUndo = (job.previewHistory?.length || 0) > 0;
  const isBusy = isApproving || isChanging || isLoading;

  // Features list
  const enabledFeatures = preview.enabledFeatures || [];

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border-light/30">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            → חזרה
          </button>
          <h1 className="text-lg font-bold">תצוגה מקדימה — {job.projectName || 'הסרטון שלך'}</h1>
          <span className="text-xs text-gray-500">{job.id.slice(0, 8)}</span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-8">
        {/* Storyboard */}
        <StoryboardGrid scenes={preview.storyboard} jobId={job.id} />

        {/* Timeline */}
        <PreviewTimelineBar timeline={preview.timeline} />

        {/* Estimates */}
        <EstimatesCard
          enabledFeaturesCount={preview.enabledFeaturesCount}
          totalFeatures={preview.totalFeatures}
          estimatedDuration={preview.estimatedDuration}
          estimatedRenderTime={preview.estimatedRenderTime}
          estimatedCost={preview.estimatedCost}
          viralityEstimate={preview.viralityEstimate}
        />

        {/* Cost comparison */}
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-center flex-1">
              <div className="text-gray-500 text-xs mb-1">עורך אנושי</div>
              <div className="text-gray-400 line-through text-lg font-mono">₪500+</div>
            </div>
            <div className="text-gray-700 text-lg">vs</div>
            <div className="text-center flex-1">
              <div className="text-gray-500 text-xs mb-1">עלות AI</div>
              <div className="text-amber-400 text-lg font-bold font-mono">{preview.estimatedCost}</div>
            </div>
          </div>
        </div>

        {/* Enabled features */}
        {enabledFeatures.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">⚡</span>
              פיצ׳רים שיופעלו ({enabledFeatures.length} מתוך {preview.totalFeatures})
            </h3>
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <div className="flex flex-wrap gap-1.5">
                {enabledFeatures.map((feature, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-1 rounded-full bg-accent-purple/10 text-accent-purple-light border border-accent-purple/20"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Subtitle preview */}
        {preview.subtitlePreview && (
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h3 className="text-xs text-gray-500 mb-2 flex items-center gap-1">
              <span>💬</span> כתוביות
            </h3>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <span className="text-sm text-white font-medium">{preview.subtitlePreview}</span>
            </div>
          </div>
        )}

        {/* B-Roll prompts */}
        <BRollPreview prompts={preview.brollPrompts} />

        {/* Script (prompt-only) */}
        {preview.script && <ScriptPreviewPanel script={preview.script} />}

        {/* Edit style & music info */}
        {(preview.editStyle || preview.musicMood || preview.voiceoverStyle) && (
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h3 className="text-xs text-gray-500 mb-2">הגדרות סגנון</h3>
            <div className="flex flex-wrap gap-3 text-xs text-gray-300">
              {preview.editStyle && (
                <span>🎨 סגנון: <strong>{preview.editStyle}</strong></span>
              )}
              {preview.musicMood && (
                <span>🎵 מוזיקה: <strong>{preview.musicMood}</strong></span>
              )}
              {preview.voiceoverStyle && (
                <span>🎙️ קריינות: <strong>{preview.voiceoverStyle}</strong></span>
              )}
            </div>
          </div>
        )}

        {/* Chat input */}
        <PreviewChat
          onSend={handleChange}
          isLoading={isBusy}
          changeHistory={changeHistory}
        />

        {/* Approve / Undo buttons */}
        <ApproveButton
          onApprove={handleApprove}
          onUndo={handleUndo}
          canUndo={canUndo}
          isLoading={isBusy}
        />
      </div>
    </div>
  );
}
