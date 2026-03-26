import { useState, useEffect } from 'react';

interface AuditStep {
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'skipped' | 'not-connected';
  details: string;
  durationMs: number;
}

interface AuditReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notConnected: number;
  steps: AuditStep[];
  criticalIssues: string[];
  summary: string;
}

const statusIcon: Record<string, string> = {
  passed: '✅',
  failed: '❌',
  skipped: '⏭️',
  'not-connected': '🔌',
};

const statusColor: Record<string, string> = {
  passed: 'text-green-400',
  failed: 'text-red-400',
  skipped: 'text-yellow-400',
  'not-connected': 'text-gray-500',
};

const statusBg: Record<string, string> = {
  passed: 'bg-green-500/10 border-green-500/20',
  failed: 'bg-red-500/10 border-red-500/20',
  skipped: 'bg-yellow-500/10 border-yellow-500/20',
  'not-connected': 'bg-gray-500/10 border-gray-500/20',
};

export default function AuditPanel({ jobId }: { jobId: string }) {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen) return;
    fetch(`/api/jobs/${jobId}/audit`)
      .then(res => res.json())
      .then(data => {
        if (data && data.total) setReport(data);
      })
      .catch(() => {});
  }, [jobId, isOpen]);

  // Only show in development
  if (import.meta.env.PROD) return null;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-dark-card border border-dark-border-light rounded-xl px-4 py-2 text-sm text-gray-400 hover:text-white hover:border-purple-500/50 transition-all shadow-lg"
      >
        Audit
      </button>
    );
  }

  if (!report) {
    return (
      <div className="fixed bottom-4 left-4 z-50 bg-dark-card border border-dark-border-light rounded-xl px-6 py-4 shadow-lg">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Loading audit...</span>
          <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white text-xs mr-2">X</button>
        </div>
      </div>
    );
  }

  const categories = [...new Set(report.steps.map(s => s.category))];
  const filteredSteps = filter === 'all'
    ? report.steps
    : filter === 'issues'
      ? report.steps.filter(s => s.status === 'failed' || s.status === 'not-connected')
      : report.steps.filter(s => s.category === filter);

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-dark-bg border border-dark-border-light rounded-2xl shadow-2xl max-w-lg max-h-[80vh] overflow-hidden flex flex-col" style={{ width: '480px' }}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-border-light/50 flex items-center justify-between bg-dark-card/50">
        <div>
          <h3 className="text-sm font-bold text-white">Pipeline Audit</h3>
          <p className="text-xs text-gray-400 mt-0.5">{report.summary}</p>
        </div>
        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white text-sm px-2">X</button>
      </div>

      {/* Stats bar */}
      <div className="px-4 py-2 flex gap-3 border-b border-dark-border-light/30 text-xs">
        <span className="text-green-400">{report.passed} passed</span>
        <span className="text-red-400">{report.failed} failed</span>
        <span className="text-yellow-400">{report.skipped} skipped</span>
        <span className="text-gray-500">{report.notConnected} disconnected</span>
      </div>

      {/* Filter */}
      <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-b border-dark-border-light/30">
        <FilterBtn label="All" value="all" current={filter} onClick={setFilter} />
        <FilterBtn label="Issues" value="issues" current={filter} onClick={setFilter} />
        {categories.map(cat => (
          <FilterBtn key={cat} label={cat} value={cat} current={filter} onClick={setFilter} />
        ))}
      </div>

      {/* Steps list */}
      <div className="overflow-y-auto flex-1 px-3 py-2 space-y-1">
        {filteredSteps.map((step, i) => (
          <div key={i} className={`flex items-start gap-2 px-3 py-1.5 rounded-lg border text-xs ${statusBg[step.status]}`}>
            <span className="shrink-0 mt-0.5">{statusIcon[step.status]}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-gray-500 font-mono">{step.category}</span>
                <span className="text-gray-600">&gt;</span>
                <span className={`font-medium ${statusColor[step.status]}`}>{step.name}</span>
              </div>
              <p className="text-gray-400 mt-0.5 break-words">{step.details}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Critical issues */}
      {report.criticalIssues.length > 0 && filter === 'all' && (
        <div className="px-4 py-2 border-t border-dark-border-light/30 bg-red-500/5 max-h-32 overflow-y-auto">
          <p className="text-xs font-bold text-red-400 mb-1">Critical Issues ({report.criticalIssues.length})</p>
          {report.criticalIssues.slice(0, 10).map((issue, i) => (
            <p key={i} className="text-xs text-red-300/70 truncate">{issue}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterBtn({ label, value, current, onClick }: { label: string; value: string; current: string; onClick: (v: string) => void }) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-2.5 py-1 rounded-lg text-xs whitespace-nowrap transition-colors ${
        current === value
          ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
          : 'bg-dark-card text-gray-500 border border-dark-border-light hover:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
