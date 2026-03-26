import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import StoryboardGrid from '../components/StoryboardGrid';
import PreviewTimelineBar from '../components/PreviewTimelineBar';
import EstimatesCard from '../components/EstimatesCard';
import BRollPreview from '../components/BRollPreview';
import ScriptPreviewPanel from '../components/ScriptPreviewPanel';
import PreviewChat from '../components/PreviewChat';
import ApproveButton from '../components/ApproveButton';
import ContentIntelligencePanel from '../components/ContentIntelligencePanel';
import BrainRecommendations from '../components/BrainRecommendations';
import BrainNotes from '../components/BrainNotes';
import SpeakerVerificationPanel from '../components/SpeakerVerificationPanel';
import { calculateLiveCost } from '../utils/costCalculator';
import type { RecommendedConfig } from '../types';

export default function PreviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, approvePreview, requestPreviewChange, undoPreviewChange, isLoading, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [changeHistory, setChangeHistory] = useState<string[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [showRecommendationBanner, setShowRecommendationBanner] = useState(false);
  const [recommendationApplied, setRecommendationApplied] = useState(false);

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

  // Detect Brain recommendations
  useEffect(() => {
    if (currentJob?.videoIntelligence?.recommendedConfig && !recommendationApplied) {
      setShowRecommendationBanner(true);
    }
  }, [currentJob?.videoIntelligence?.recommendedConfig, recommendationApplied]);

  const handleApplyRecommendations = useCallback(() => {
    setRecommendationApplied(true);
    setShowRecommendationBanner(false);
  }, []);

  const handleEditManually = useCallback(() => {
    if (!id) return;
    // Navigate to editor with recommendations pre-filled via query param
    const config = currentJob?.videoIntelligence?.recommendedConfig;
    if (config) {
      sessionStorage.setItem(`brain-config-${id}`, JSON.stringify(config));
    }
    navigate(`/editor/upload?jobId=${id}&fromBrain=true`);
  }, [id, currentJob, navigate]);

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

  // Content analysis data
  const contentAnalysis = (job as any).contentAnalysis;
  const presenterDetection = (job as any).presenterDetection;
  const videoIntelligence = (job as any).videoIntelligence;
  const brainNotes: string[] = (job as any).brainNotes || [];
  const speakerVerification = (job as any).speakerVerification;

  // Compute cost breakdown from job selections
  const previewCost = useMemo(() => {
    if (!job) return null;
    return calculateLiveCost({
      model: job.videoModel || 'kling2.5',
      duration: preview.estimatedDuration || 60,
      options: (job.options || {}) as unknown as Record<string, boolean>,
      editStyle: job.editStyle,
      voiceoverStyle: job.voiceoverStyle,
      preset: job.preset,
      aiTwin: job.options?.aiTwin || false,
      aiDubbing: job.preset === 'dubbing',
      voiceClone: false,
      hasFiles: job.mode === 'upload' && (job.files?.length ?? 0) > 0,
    });
  }, [job, preview.estimatedDuration]);

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
        {/* Video Intelligence — FIRST section */}
        {videoIntelligence && (
          <ContentIntelligencePanel intelligence={videoIntelligence} />
        )}

        {/* Brain Recommendations — auto-selected optimal config */}
        {videoIntelligence?.recommendedConfig && (
          <BrainRecommendations
            config={videoIntelligence.recommendedConfig as RecommendedConfig}
            onApply={handleApplyRecommendations}
            onEditManually={handleEditManually}
            applied={recommendationApplied}
          />
        )}

        {/* Brain Notes — override suggestions */}
        {brainNotes.length > 0 && (
          <BrainNotes notes={brainNotes} />
        )}

        {/* Recommendation banner */}
        {showRecommendationBanner && (
          <div className="bg-accent-purple/10 border border-accent-purple/30 rounded-xl p-4 text-center animate-pulse">
            <p className="text-sm text-accent-purple-light font-medium">
              המוח בחר את ההגדרות הטובות ביותר לסרטון שלך
            </p>
          </div>
        )}

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
          estimatedCost={previewCost ? `$${previewCost.total.toFixed(2)}` : preview.estimatedCost}
          viralityEstimate={preview.viralityEstimate}
          costItems={previewCost?.items}
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
              <div className="text-amber-400 text-lg font-bold font-mono">{previewCost ? `$${previewCost.total.toFixed(2)}` : preview.estimatedCost}</div>
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

        {/* Speaker Verification Section (3-Layer) */}
        {speakerVerification && (
          <SpeakerVerificationPanel verification={speakerVerification} />
        )}

        {/* Presenter Detection Section (legacy — hidden when verification is available) */}
        {!speakerVerification && presenterDetection && presenterDetection.allSpeakers?.length > 1 && (
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span className="text-lg">🎙️</span>
              זיהוי דוברים
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full mr-auto ${
                presenterDetection.confidence >= 0.8
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              }`}>
                ביטחון: {Math.round(presenterDetection.confidence * 100)}%
              </span>
            </h3>

            {/* Presenter info */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-green-400 text-sm">🎬</span>
                </div>
                <div>
                  <p className="text-xs text-white font-medium">
                    זיהינו את הפרזנטור: {presenterDetection.presenterDescription}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    דובר #{presenterDetection.presenterId}
                    {' — '}
                    {presenterDetection.presenterSegments?.length || 0} קטעי דיבור
                  </p>
                </div>
              </div>
            </div>

            {/* Other speakers */}
            {presenterDetection.allSpeakers.filter((s: any) => s.speakerId !== presenterDetection.presenterId).length > 0 && (
              <div>
                <p className="text-[11px] text-gray-400 mb-2">
                  נמצאו {presenterDetection.allSpeakers.length - 1} דוברים נוספים:
                </p>
                <div className="space-y-1.5">
                  {presenterDetection.allSpeakers
                    .filter((s: any) => s.speakerId !== presenterDetection.presenterId)
                    .map((speaker: any, i: number) => {
                      const roleLabels: Record<string, string> = {
                        director: 'במאי (מתן הוראות)',
                        assistant: 'עוזר (מקריא טקסט)',
                        interviewer: 'מראיין',
                        background: 'רקע',
                        unknown: 'לא מזוהה',
                        presenter: 'פרזנטור',
                      };
                      const isKept = speaker.role === 'interviewer' && speaker.isOnCamera;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-2 text-[11px] rounded-lg px-3 py-2 ${
                            isKept
                              ? 'bg-blue-500/5 border border-blue-500/20'
                              : 'bg-red-500/5 border border-red-500/20'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isKept ? 'bg-blue-400' : 'bg-red-400'
                          }`} />
                          <span className="text-gray-300">
                            דובר #{speaker.speakerId}: {speaker.description}
                          </span>
                          <span className="text-gray-500">
                            ({roleLabels[speaker.role] || speaker.role})
                          </span>
                          <span className={`mr-auto text-[10px] ${
                            isKept ? 'text-blue-400' : 'text-red-400'
                          }`}>
                            {isKept ? 'נשמר (על המסך)' : 'יוסר'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}

            {/* Override hint */}
            <p className="text-[10px] text-gray-600 mt-3 text-center">
              זה לא הפרזנטור? בקשו שינוי בצ׳אט למטה
            </p>
          </div>
        )}

        {/* Content Analysis Section */}
        {contentAnalysis && (
          <div className="space-y-4">
            {/* Summary banner */}
            <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-accent-purple-light mb-3 flex items-center gap-2">
                <span className="text-lg">🧠</span>
                ניתוח תוכן
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {Math.round(contentAnalysis.recommendedEdit?.totalDuration || 0)}
                    <span className="text-xs text-gray-400 font-normal mr-1">שניות</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">משך מומלץ</div>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">
                    {Math.round(contentAnalysis.presenter?.totalSpeakingTime || 0)}
                    <span className="text-xs text-gray-400 font-normal mr-1">שניות</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mt-1">תוכן איכותי</div>
                </div>
              </div>
              {contentAnalysis.recommendedEdit?.totalDuration && contentAnalysis.presenter?.totalSpeakingTime && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  זיהינו {Math.round(contentAnalysis.presenter.totalSpeakingTime / 60)} דקות של תוכן איכותי
                  מתוך {Math.round((contentAnalysis.presenter.totalSpeakingTime + contentAnalysis.presenter.totalSilentTime) / 60)} דקות צולמו
                  {' — '}
                  מומלץ לקצר ל-{contentAnalysis.recommendedEdit.totalDuration} שניות
                </p>
              )}
            </div>

            {/* Quality segments timeline */}
            {contentAnalysis.segments && contentAnalysis.segments.length > 0 && (
              <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
                <h3 className="text-xs text-gray-500 mb-3">ציר זמן איכות תוכן</h3>
                <div className="flex h-6 rounded-full overflow-hidden bg-gray-800">
                  {contentAnalysis.segments.map((seg: any, i: number) => {
                    const totalDuration = contentAnalysis.segments.reduce(
                      (sum: number, s: any) => sum + (s.end - s.start), 0
                    );
                    const width = ((seg.end - seg.start) / totalDuration) * 100;
                    const color =
                      seg.keepRecommendation === 'must-keep' ? 'bg-green-500' :
                      seg.keepRecommendation === 'keep' ? 'bg-blue-500' :
                      seg.keepRecommendation === 'optional' ? 'bg-gray-500' :
                      'bg-red-500';
                    return (
                      <div
                        key={i}
                        className={`${color} relative group cursor-pointer transition-opacity hover:opacity-80`}
                        style={{ width: `${Math.max(width, 0.5)}%` }}
                        title={`${seg.start.toFixed(1)}s - ${seg.end.toFixed(1)}s | ${seg.reason} (${seg.quality}/10)`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> חובה</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> שמור</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500 inline-block" /> אופציונלי</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> חתוך</span>
                </div>
              </div>
            )}

            {/* Best moments */}
            {contentAnalysis.bestMoments && contentAnalysis.bestMoments.length > 0 && (
              <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
                <h3 className="text-xs text-gray-500 mb-3">רגעים מובחרים</h3>
                <div className="space-y-2">
                  {contentAnalysis.bestMoments.map((moment: any, i: number) => (
                    <div key={i} className="bg-gray-800/50 rounded-lg p-3 flex items-start gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-400 text-xs font-bold">{moment.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">"{moment.text}"</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {moment.start.toFixed(1)}s - {moment.end.toFixed(1)}s
                          {' | '}
                          {moment.suggestedUse}
                        </p>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple-light flex-shrink-0">
                        {moment.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hook recommendation */}
            {contentAnalysis.hookOptions && contentAnalysis.hookOptions.length > 0 && (
              <div className="bg-dark-card border border-amber-500/30 rounded-xl p-4">
                <h3 className="text-xs text-amber-400 mb-3 flex items-center gap-1">
                  <span>🎯</span> אפשרויות הוק (3 המובילות)
                </h3>
                <div className="space-y-2">
                  {contentAnalysis.hookOptions.map((hook: any, i: number) => (
                    <div
                      key={i}
                      className={`rounded-lg p-3 border transition-colors cursor-pointer ${
                        i === 0
                          ? 'bg-amber-500/10 border-amber-500/30'
                          : 'bg-gray-800/50 border-dark-border-light hover:border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-white font-medium">
                          {i === 0 ? 'מומלץ: ' : ''}"{hook.text}"
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                          ויראליות: {hook.viralScore}/10
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500">
                        בשנייה {hook.start.toFixed(1)} | {hook.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced analysis section */}
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">ניתוח תוכן מתקדם</h3>
              <div className="space-y-3">
                {/* Footage issues */}
                {contentAnalysis.footageIssues && contentAnalysis.footageIssues.length > 0 && (
                  <div>
                    <p className="text-[11px] text-red-400 mb-1.5">
                      מצאנו {contentAnalysis.footageIssues.length} בעיות בחומר הגלם:
                    </p>
                    {contentAnalysis.footageIssues.map((issue: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] mb-1">
                        <span className="text-red-400">&#x2022;</span>
                        <span className="text-gray-400">{issue.issue}</span>
                        <span className="text-green-400 mr-auto">← {issue.solution}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Auto-fixes summary */}
                <div className="flex flex-wrap gap-2 text-[10px]">
                  {contentAnalysis.brollCoverMoments?.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {contentAnalysis.brollCoverMoments.length} קטעים יכוסו ב-B-Roll
                    </span>
                  )}
                  {contentAnalysis.reconstructedSentences?.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                      {contentAnalysis.reconstructedSentences.length} משפטים ישוחזרו מכמה טייקים
                    </span>
                  )}
                  {contentAnalysis.cutTransitions?.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {contentAnalysis.cutTransitions.length} מעברים חכמים
                    </span>
                  )}
                </div>

                {/* Emotional arc visualization */}
                {contentAnalysis.emotionalArc && contentAnalysis.emotionalArc.length > 0 && (
                  <div>
                    <p className="text-[11px] text-gray-400 mb-2">עקומת אנרגיה:</p>
                    <div className="flex items-end gap-0.5 h-12">
                      {contentAnalysis.emotionalArc.map((arc: any, i: number) => {
                        const totalDur = contentAnalysis.emotionalArc.reduce(
                          (sum: number, a: any) => sum + (a.end - a.start), 0
                        );
                        const width = ((arc.end - arc.start) / totalDur) * 100;
                        const height = (arc.energy / 10) * 100;
                        const color =
                          arc.section === 'hook' ? 'bg-red-500' :
                          arc.section === 'peak' ? 'bg-amber-500' :
                          arc.section === 'build' ? 'bg-blue-500' :
                          'bg-green-500';
                        return (
                          <div
                            key={i}
                            className="flex flex-col items-center justify-end"
                            style={{ width: `${width}%` }}
                            title={`${arc.section} | ${arc.musicMood} | אנרגיה: ${arc.energy}/10`}
                          >
                            <div
                              className={`${color} rounded-t w-full opacity-70`}
                              style={{ height: `${height}%` }}
                            />
                            <span className="text-[8px] text-gray-600 mt-0.5">{arc.section}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
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
