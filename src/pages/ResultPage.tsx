import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import VideoPlayer from '../components/VideoPlayer';
import TimelinePreview from '../components/TimelinePreview';
import ViralityScore from '../components/ViralityScore';
import RevisionPanel from '../components/RevisionPanel';
import VersionHistory from '../components/VersionHistory';
import ProjectDetails from '../components/ProjectDetails';
import QABadge from '../components/QABadge';
import RetentionCurve from '../components/RetentionCurve';
import ABTestViewer from '../components/ABTestViewer';
import EditingSummary from '../components/EditingSummary';
import ScoresDashboard from '../components/ScoresDashboard';
import DownloadOptions from '../components/DownloadOptions';
import RevisionRequest from '../components/RevisionRequest';
import FinalApproval from '../components/FinalApproval';
import AuditPanel from '../components/AuditPanel';

export default function ResultPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    currentJob,
    fetchJob,
    submitRevision,
    sendChatEdit,
    fetchVersions,
    revertToVersion,
    isLoading,
  } = useJobStore();

  const [showHistory, setShowHistory] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  useEffect(() => {
    if (id) fetchJob(id);
  }, [id, fetchJob]);

  // Poll for job updates while processing
  useEffect(() => {
    if (!id || !currentJob) return;
    if (currentJob.status === 'processing' || currentJob.status === 'planning') {
      const interval = setInterval(() => fetchJob(id), 2000);
      return () => clearInterval(interval);
    }
  }, [id, currentJob?.status, fetchJob]);

  const handleRevision = useCallback(
    (revision: Parameters<typeof submitRevision>[1]) => {
      if (id) submitRevision(id, revision);
    },
    [id, submitRevision]
  );

  const handleChatSend = useCallback(
    (message: string) => {
      if (!id) return Promise.resolve('שגיאה');
      return sendChatEdit(id, message);
    },
    [id, sendChatEdit]
  );

  const handleDownload = useCallback((url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    a.click();
  }, []);

  if (!currentJob) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <div className="animate-spin text-4xl">🔄</div>
        <p className="text-gray-400 text-sm">טוען תוצאות...</p>
      </div>
    );
  }

  const job = currentJob;
  const result = job.result;
  const activeVersion = job.versions.find((v) => v.isActive);
  const versionNumber = activeVersion?.versionNumber || job.versions.length || 1;

  // Determine video URL
  const videoUrl = result?.videoUrl || (id ? `/api/jobs/${id}/video` : undefined);

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-bg/80 backdrop-blur-lg border-b border-dark-border-light/30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            → חזרה
          </button>
          <h1 className="text-lg font-bold">{job.projectName}</h1>
          <span className="text-xs text-gray-500">v{versionNumber}</span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        {/* Virality Score */}
        {result?.viralityScore && (
          <ViralityScore score={result.viralityScore} />
        )}

        {/* QA Badge */}
        {id && <QABadge jobId={id} />}

        {/* Video Player */}
        <div className="relative">
          <VideoPlayer
            videoUrl={videoUrl}
            versionNumber={versionNumber}
            onError={(msg) => setVideoError(msg)}
          />
          {videoError && (
            <div className="mt-2 text-center text-sm text-yellow-400 bg-yellow-400/10 rounded-xl px-4 py-2">
              {videoError}
            </div>
          )}

          {/* Download + Share buttons */}
          {videoUrl && (
            <div className="flex gap-3 mt-3 justify-center">
              <a
                href={videoUrl}
                download={`video-agents-${id}.mp4`}
                className="gradient-purple px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                הורד סרטון
              </a>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="border border-dark-border-light bg-dark-card px-5 py-2.5 rounded-xl text-sm text-gray-300 hover:border-gray-500 transition-colors flex items-center gap-2"
              >
                העתק קישור
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="border border-dark-border-light bg-dark-card px-5 py-2.5 rounded-xl text-sm text-gray-300 hover:border-gray-500 transition-colors flex items-center gap-2"
              >
                היסטוריה ({job.versions.length})
              </button>
            </div>
          )}
        </div>

        {/* Timeline */}
        {result && result.segments && result.segments.length > 0 && (
          <TimelinePreview
            segments={result.segments}
            duration={result.duration}
          />
        )}

        {/* Download Options — ALWAYS available */}
        {id && <DownloadOptions jobId={id} job={job} />}

        {/* A/B Test Viewer */}
        {id && <ABTestViewer jobId={id} />}

        {/* Editing Summary */}
        <EditingSummary job={job} />

        {/* Scores Dashboard */}
        <ScoresDashboard job={job} />

        {/* Retention Curve */}
        {id && <RetentionCurve jobId={id} />}

        {/* Revision Request — Smart analysis flow (only if not approved) */}
        {id && !(job as any).approvedFinal && (
          <RevisionRequest jobId={id} job={job} />
        )}

        {/* Classic Revision Panel */}
        <RevisionPanel
          jobId={id || ''}
          onSubmitRevision={handleRevision}
          onChatSend={handleChatSend}
          isLoading={isLoading}
        />

        {/* Final Approval */}
        {id && (
          <FinalApproval
            jobId={id}
            job={job}
            onApprove={() => fetchJob(id)}
          />
        )}

        {/* Project Details */}
        <ProjectDetails job={job} />
      </div>

      {/* Pipeline Audit (dev mode only) */}
      {id && <AuditPanel jobId={id} />}

      {/* Version History Slide-in */}
      <VersionHistory
        jobId={id || ''}
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        fetchVersions={fetchVersions}
        onRevert={revertToVersion}
        onDownload={handleDownload}
      />
    </div>
  );
}
