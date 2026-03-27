import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import StoryboardGrid from '../components/StoryboardGrid';
import BRollPreview from '../components/BRollPreview';
import ScriptPreviewPanel from '../components/ScriptPreviewPanel';
import PreviewChat from '../components/PreviewChat';
import ApproveButton from '../components/ApproveButton';
import EditingPlanPreview from '../components/EditingPlanPreview';
import CostBreakdownDetailed from '../components/CostBreakdown';
import { getModelById, VIDEO_MODELS } from '../data/videoModels';

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, approvePreview, requestPreviewChange, undoPreviewChange, isLoading, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [changeHistory, setChangeHistory] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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
    setChatError(null);

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
      } else {
        setChatError('שגיאה בעדכון — נסה שוב');
      }
    } catch {
      setChatError('שגיאה בחיבור לשרת');
    } finally {
      setIsChanging(false);
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

  // Compute preview data (must be before early returns for Rules of Hooks)
  const preview = currentJob?.status === 'preview' ? currentJob.previewData : null;

  // Derive model and B-Roll count — single source of truth
  const selectedModel = useMemo(() => {
    const modelId = currentJob?.videoModel || (currentJob as any)?.model || 'kling-v2.5-turbo';
    return getModelById(modelId) || VIDEO_MODELS.find(m => m.id === 'kling-v2.5-turbo') || VIDEO_MODELS[0];
  }, [currentJob?.videoModel, (currentJob as any)?.model]);

  const brollCount = preview?.brollPrompts?.length || 0;
  const pricePerClip = selectedModel.pricePerClip;

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

  // Planning/generating preview — redirect to ProcessingPage (same premium design)
  if (job.status === 'pending' || job.status === 'planning' || job.status === 'transcribing' || job.status === 'analyzing') {
    navigate(`/jobs/${id}`, { replace: true });
    return null;
  }

  // Preview ready
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

  // Recalculate B-Roll timestamps relative to the edited (shorter) timeline
  const adjustedBrollPrompts = useMemo(() => {
    if (!preview?.brollPrompts?.length) return [];
    if (!contentSelection?.segments?.length) return preview.brollPrompts;

    // Get kept segments sorted by start time
    const keptSegments = contentSelection.segments
      .filter((seg: any) => seg.decision === 'must-keep' || seg.decision === 'keep' || seg.decision === 'maybe')
      .sort((a: any, b: any) => a.start - b.start);

    if (!keptSegments.length) return preview.brollPrompts;

    // Map original timestamp → edited timeline position
    const mapTimestamp = (originalTs: number): number => {
      let editedTime = 0;
      for (const seg of keptSegments) {
        const segStart = seg.trimStart != null ? seg.start + seg.trimStart : seg.start;
        const segEnd = seg.trimEnd != null ? seg.end - seg.trimEnd : seg.end;
        const segDuration = Math.max(0, segEnd - segStart);

        if (originalTs <= segStart) {
          // Timestamp is before or at this segment start → snap to current edited position
          return editedTime;
        }
        if (originalTs <= segEnd) {
          // Timestamp falls within this kept segment
          return editedTime + (originalTs - segStart);
        }
        editedTime += segDuration;
      }
      // Past all segments → clamp to end
      return editedTime;
    };

    return preview.brollPrompts.map((item: any) => ({
      ...item,
      timestamp: mapTimestamp(item.timestamp),
    }));
  }, [preview?.brollPrompts, contentSelection?.segments]);

  const canUndo = (job.previewHistory?.length || 0) > 0;
  const isBusy = isApproving || isChanging || isLoading;

  // Content analysis data
  const contentAnalysis = (job as any).contentAnalysis;
  const contentSelection = (job as any).contentSelection;
  const editingBlueprint = contentAnalysis?.editingBlueprint;
  const emotionalArc = contentAnalysis?.detailedEmotionalArc || contentAnalysis?.emotionalArc;
  const retentionPlan = (job as any).retentionPlan;
  const paceMode: string = (job as any).paceMode || 'balanced';
  const subtitleStyleData = (job as any).subtitleStyle;
  const beatMap = (job as any).beatMap;
  const marketingPlan = (job as any).videoIntelligence?.marketingPlan;
  const hasMusic = !!(job.options as any)?.backgroundMusic || !!(job.options as any)?.energeticMusic || !!(job.options as any)?.calmMusic;
  const hasFiles = job.mode === 'upload' && (job.files?.length ?? 0) > 0;

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
          <div className="w-12" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-6 space-y-8" dir="rtl">

        {/* ===== SECTION 1: Storyboard ===== */}
        <StoryboardGrid scenes={preview.storyboard} jobId={job.id} />

        {/* ===== SECTION 2: Editing Plan — simple stats ===== */}
        {editingBlueprint && (
          <EditingPlanPreview
            editingBlueprint={editingBlueprint}
            contentSelection={contentSelection}
            marketingPlan={marketingPlan}
            emotionalArc={emotionalArc}
            retentionPlan={retentionPlan}
            paceMode={paceMode}
            subtitleStyle={subtitleStyleData}
            beatMap={beatMap}
            brandKit={job.brandKit}
          />
        )}

        {/* ===== SECTION 3: B-Roll — user-friendly ===== */}
        <BRollPreview prompts={adjustedBrollPrompts} pricePerClip={pricePerClip} />

        {/* Script (prompt-only mode) */}
        {preview.script && <ScriptPreviewPanel script={preview.script} />}

        {/* ===== SECTION 4: Cost — one clean summary ===== */}
        <CostBreakdownDetailed
          blueprint={editingBlueprint}
          selectedModel={currentJob?.videoModel || (currentJob as any)?.model}
          hasMusic={hasMusic}
          hasFiles={hasFiles}
          brollCount={brollCount}
        />

        {/* ===== SECTION 5: Processing time ===== */}
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4 flex items-center justify-between">
          <span className="text-sm text-gray-300 flex items-center gap-2">
            <span>⏱️</span> זמן עיבוד משוער
          </span>
          <span className="font-bold text-white font-mono">
            {preview.estimatedRenderTime}
          </span>
        </div>

        {/* Chat input for changes */}
        {chatError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-400 text-center">
            {chatError}
          </div>
        )}
        <PreviewChat
          onSend={handleChange}
          isLoading={isBusy}
          changeHistory={changeHistory}
        />

        {/* ===== SECTION 6: Approve button ===== */}
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
