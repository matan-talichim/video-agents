import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';
import VideoPlayer from '../components/VideoPlayer';
import TimelinePreview from '../components/TimelinePreview';
import ViralityScore from '../components/ViralityScore';
import RevisionPanel from '../components/RevisionPanel';
import VersionHistory from '../components/VersionHistory';
import ProjectDetails from '../components/ProjectDetails';

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
  const [exportFormat, setExportFormat] = useState('mp4');

  useEffect(() => {
    if (id) fetchJob(id);
  }, [id, fetchJob]);

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">🔄</div>
      </div>
    );
  }

  const job = currentJob;
  const result = job.result;
  const activeVersion = job.versions.find((v) => v.isActive);
  const versionNumber = activeVersion?.versionNumber || job.versions.length || 1;

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

        {/* Video Player */}
        <VideoPlayer
          videoUrl={result?.videoUrl}
          versionNumber={versionNumber}
        />

        {/* Timeline */}
        {result && result.segments.length > 0 && (
          <TimelinePreview
            segments={result.segments}
            duration={result.duration}
          />
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {result?.videoUrl && (
            <button
              onClick={() => handleDownload(result.videoUrl)}
              className="gradient-purple px-6 py-2.5 rounded-xl text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              ⬇️ הורד סרטון
            </button>
          )}

          <button
            onClick={() => setShowHistory(true)}
            className="border border-dark-border-light bg-dark-card px-5 py-2.5 rounded-xl text-sm text-gray-300 hover:border-gray-500 transition-colors flex items-center gap-2"
          >
            📜 היסטוריה ({job.versions.length})
          </button>

          <div className="flex items-center gap-2 bg-dark-card border border-dark-border-light rounded-xl px-3">
            <label className="text-xs text-gray-500">פורמט:</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              className="bg-transparent text-sm text-white py-2 focus:outline-none cursor-pointer"
            >
              <option value="mp4">MP4</option>
              <option value="mov">MOV</option>
              <option value="gif">GIF</option>
              <option value="vertical">אנכי (9:16)</option>
              <option value="4k">4K</option>
            </select>
          </div>
        </div>

        {/* Revision Panel */}
        <RevisionPanel
          jobId={id || ''}
          onSubmitRevision={handleRevision}
          onChatSend={handleChatSend}
          isLoading={isLoading}
        />

        {/* Project Details */}
        <ProjectDetails job={job} />
      </div>

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
