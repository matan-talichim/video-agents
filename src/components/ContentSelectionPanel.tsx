import { useState } from 'react';

interface ScoredSegment {
  start: number;
  end: number;
  text: string;
  speakerId: number;
  scores: {
    delivery: number;
    content: number;
    emotion: number;
    conciseness: number;
    uniqueness: number;
    hookPotential: number;
    quotability: number;
    visualInterest: number;
    audioQuality: number;
    continuity: number;
    relevance: number;
    energy: number;
  };
  totalScore: number;
  decision: 'must-keep' | 'keep' | 'maybe' | 'cut' | 'filler';
  issues: string[];
  editNotes: {
    canBeShortened: boolean;
    trimStart: number;
    trimEnd: number;
    needsBRoll: boolean;
    brollReason?: string;
    needsZoom: boolean;
    zoomType?: 'in' | 'out';
    hasGesture: boolean;
    hasPause: boolean;
    canCombineWith?: number;
  };
}

interface ContentSelectionResult {
  segments: ScoredSegment[];
  summary: {
    totalFootageDuration: number;
    keepDuration: number;
    cutDuration: number;
    cutPercentage: number;
    averageScore: number;
    lowestKeptScore: number;
    mustKeepCount: number;
    keepCount: number;
    maybeCount: number;
    cutCount: number;
    fillerCount: number;
  };
  topMoments: Array<{
    rank: number;
    segment: ScoredSegment;
    reason: string;
    suggestedUse: 'hook' | 'highlight' | 'social-clip' | 'quote-card' | 'closing';
  }>;
  reconstructions: Array<{
    finalText: string;
    fragments: Array<{ segmentIndex: number; start: number; end: number; text: string }>;
    reason: string;
  }>;
  suggestedOrder: Array<{ segmentIndex: number; reason: string }>;
  brollNeeded: Array<{ start: number; end: number; reason: string; suggestedPrompt: string }>;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const decisionColors: Record<string, { bg: string; text: string; label: string }> = {
  'must-keep': { bg: 'bg-green-500/20', text: 'text-green-400', label: 'חובה לשמור' },
  'keep': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'לשמור' },
  'maybe': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'אולי' },
  'cut': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'לחתוך' },
  'filler': { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'מילוי' },
};

const suggestedUseLabels: Record<string, string> = {
  'hook': 'הוק פתיחה',
  'highlight': 'רגע שיא',
  'social-clip': 'קליפ לרשתות',
  'quote-card': 'כרטיס ציטוט',
  'closing': 'סיום',
};

export default function ContentSelectionPanel({ selection }: { selection: ContentSelectionResult }) {
  const [showCuts, setShowCuts] = useState(false);
  const { summary, topMoments, reconstructions, brollNeeded } = selection;

  return (
    <div className="space-y-4">
      {/* Summary Banner */}
      <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-accent-purple-light mb-3">
          בחירת תוכן — 12 ממדים
        </h3>

        {/* Duration stats */}
        <div className="flex items-center gap-6 text-sm mb-3">
          <span className="text-gray-400">
            צולמו: <span className="text-white font-medium">{formatTime(summary.totalFootageDuration)}</span>
          </span>
          <span className="text-gray-400">
            נשמר: <span className="text-green-400 font-medium">{formatTime(summary.keepDuration)}</span>
          </span>
          <span className="text-gray-400">
            נחתך: <span className="text-red-400 font-medium">{summary.cutPercentage}%</span>
          </span>
          <span className="text-gray-400">
            ציון ממוצע: <span className="text-white font-medium">{summary.averageScore}</span>
          </span>
        </div>

        {/* Decision breakdown */}
        <div className="flex items-center gap-3 text-xs">
          {summary.mustKeepCount > 0 && (
            <span className={`${decisionColors['must-keep'].bg} ${decisionColors['must-keep'].text} px-2 py-1 rounded`}>
              {summary.mustKeepCount} חובה
            </span>
          )}
          {summary.keepCount > 0 && (
            <span className={`${decisionColors['keep'].bg} ${decisionColors['keep'].text} px-2 py-1 rounded`}>
              {summary.keepCount} לשמור
            </span>
          )}
          {summary.maybeCount > 0 && (
            <span className={`${decisionColors['maybe'].bg} ${decisionColors['maybe'].text} px-2 py-1 rounded`}>
              {summary.maybeCount} אולי
            </span>
          )}
          {summary.cutCount > 0 && (
            <span className={`${decisionColors['cut'].bg} ${decisionColors['cut'].text} px-2 py-1 rounded`}>
              {summary.cutCount} לחתוך
            </span>
          )}
          {summary.fillerCount > 0 && (
            <span className={`${decisionColors['filler'].bg} ${decisionColors['filler'].text} px-2 py-1 rounded`}>
              {summary.fillerCount} מילוי
            </span>
          )}
        </div>
      </div>

      {/* Top 5 Moments */}
      {topMoments.length > 0 && (
        <div className="bg-dark-card border border-accent-purple/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-accent-purple-light mb-3">
            5 הרגעים הטובים ביותר
          </h4>
          <div className="space-y-2">
            {topMoments.map((moment, i) => (
              <div key={i} className="flex items-start gap-3 bg-dark-bg/50 rounded-lg p-3">
                <span className="text-lg font-bold text-accent-purple-light min-w-[24px]">#{moment.rank}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate" dir="auto">{moment.segment.text}</p>
                  <p className="text-xs text-gray-400 mt-1">{moment.reason}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{formatTime(moment.segment.start)} - {formatTime(moment.segment.end)}</span>
                    <span className="text-xs bg-accent-purple/20 text-accent-purple-light px-1.5 py-0.5 rounded">
                      {suggestedUseLabels[moment.suggestedUse] || moment.suggestedUse}
                    </span>
                    <span className="text-xs text-gray-500">ציון: {moment.segment.totalScore}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reconstructions */}
      {reconstructions.length > 0 && (
        <div className="bg-dark-card border border-yellow-500/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-yellow-400 mb-3">
            שוחזרו {reconstructions.length} משפטים מכמה טייקים
          </h4>
          <div className="space-y-2">
            {reconstructions.map((rec, i) => (
              <div key={i} className="bg-dark-bg/50 rounded-lg p-3">
                <p className="text-sm text-white" dir="auto">"{rec.finalText}"</p>
                <p className="text-xs text-gray-400 mt-1">{rec.reason}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {rec.fragments.length} חלקים מ-{new Set(rec.fragments.map(f => f.segmentIndex)).size} טייקים
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cut Segments */}
      <div className="bg-dark-card border border-gray-700/50 rounded-xl p-4">
        <button
          onClick={() => setShowCuts(!showCuts)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors w-full"
        >
          <span className="transform transition-transform" style={{ transform: showCuts ? 'rotate(90deg)' : 'none' }}>
            &#9654;
          </span>
          {summary.cutCount + summary.fillerCount} קטעים נחתכו — לחצו לצפייה
        </button>
        {showCuts && (
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {selection.segments
              .filter(s => s.decision === 'cut' || s.decision === 'filler')
              .map((seg, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-500 py-1">
                  <span className="min-w-[80px]">{formatTime(seg.start)} - {formatTime(seg.end)}</span>
                  <span className={`${decisionColors[seg.decision].text} min-w-[40px]`}>
                    {decisionColors[seg.decision].label}
                  </span>
                  <span className="truncate" dir="auto">{seg.text.slice(0, 60)}</span>
                  {seg.issues.length > 0 && (
                    <span className="text-gray-600 flex-shrink-0">({seg.issues[0]})</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* B-Roll Needed */}
      {brollNeeded.length > 0 && (
        <div className="bg-dark-card border border-cyan-500/20 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3">
            {brollNeeded.length} קטעים צריכים B-Roll
          </h4>
          <div className="space-y-1">
            {brollNeeded.map((br, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                <span className="min-w-[80px] text-gray-500">{formatTime(br.start)} - {formatTime(br.end)}</span>
                <span className="text-cyan-400">{br.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
