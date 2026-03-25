import { useState } from 'react';

interface VideoIntelligence {
  concept: {
    title: string;
    summary: string;
    category: string;
    industry: string;
    targetAudience: string;
    tone: string;
  };
  keyPoints: Array<{
    point: string;
    timestamp: number;
    importance: number;
    type: string;
    suggestedVisual: string;
  }>;
  storyArc: {
    hasNaturalArc: boolean;
    suggestedStructure: Array<{
      section: string;
      start: number;
      end: number;
      title: string;
      keyMessage: string;
    }>;
    missingElements: string[];
    suggestedAdditions: Array<{
      element: string;
      type: string;
      suggestion: string;
    }>;
  };
  footageAssessment: {
    overallQuality: number;
    videoQuality: {
      resolution: string;
      lighting: string;
      stability: string;
      framing: string;
      background: string;
    };
    audioQuality: {
      clarity: string;
      backgroundNoise: string;
      volume: string;
      echo: boolean;
    };
    issues: string[];
    autoFixes: string[];
  };
  contentDensity: {
    totalFootageDuration: number;
    usableContentDuration: number;
    wastePercentage: number;
    contentPerMinute: number;
    recommendation: string;
  };
  typeSpecific: Record<string, any>;
  textOverlayPlan: Array<{
    text: string;
    timestamp: number;
    duration: number;
    type: string;
    style: string;
    animation: string;
  }>;
  smartBRollPlan: Array<{
    timestamp: number;
    duration: number;
    reason: string;
    prompt: string;
    priority: string;
    alternative: string;
  }>;
  edgeCases?: {
    isBRollOnly: boolean;
    isVeryShort: boolean;
    isBilingual: boolean;
    isRepetitive: boolean;
    isVeryLong: boolean;
    isMultipleClips: boolean;
    warnings: string[];
  };
}

const categoryLabels: Record<string, string> = {
  'talking-head': 'Talking Head',
  'interview': 'ראיון',
  'product-demo': 'הדגמת מוצר',
  'tour': 'סיור',
  'testimonial': 'עדות',
  'presentation': 'מצגת',
  'event': 'אירוע',
  'broll-only': 'B-Roll בלבד',
  'screen-recording': 'הקלטת מסך',
  'mixed': 'מעורב',
};

const toneLabels: Record<string, string> = {
  professional: 'מקצועי',
  casual: 'קז׳ואל',
  energetic: 'אנרגטי',
  emotional: 'רגשי',
  educational: 'חינוכי',
};

const qualityLabels: Record<string, { text: string; color: string }> = {
  poor: { text: 'חלש', color: 'text-red-400' },
  acceptable: { text: 'סביר', color: 'text-amber-400' },
  good: { text: 'טוב', color: 'text-green-400' },
  professional: { text: 'מקצועי', color: 'text-emerald-400' },
  low: { text: 'נמוכה', color: 'text-red-400' },
  medium: { text: 'בינונית', color: 'text-amber-400' },
  high: { text: 'גבוהה', color: 'text-green-400' },
  shaky: { text: 'רועד', color: 'text-red-400' },
  'mostly-stable': { text: 'כמעט יציב', color: 'text-amber-400' },
  stable: { text: 'יציב', color: 'text-green-400' },
  tripod: { text: 'חצובה', color: 'text-emerald-400' },
  messy: { text: 'מבולגן', color: 'text-red-400' },
  clean: { text: 'נקי', color: 'text-green-400' },
  heavy: { text: 'כבד', color: 'text-red-400' },
  moderate: { text: 'בינוני', color: 'text-amber-400' },
  light: { text: 'קל', color: 'text-green-400' },
  none: { text: 'ללא', color: 'text-emerald-400' },
  'too-quiet': { text: 'שקט מדי', color: 'text-red-400' },
  'too-loud': { text: 'חזק מדי', color: 'text-red-400' },
};

const sectionLabels: Record<string, string> = {
  hook: 'הוק',
  problem: 'בעיה',
  solution: 'פתרון',
  proof: 'הוכחה',
  benefits: 'יתרונות',
  features: 'תכונות',
  testimonial: 'עדות',
  cta: 'CTA',
  intro: 'פתיחה',
  main: 'עיקרי',
  conclusion: 'סיום',
};

const sectionColors: Record<string, string> = {
  hook: 'bg-red-500',
  problem: 'bg-orange-500',
  solution: 'bg-blue-500',
  proof: 'bg-teal-500',
  benefits: 'bg-green-500',
  features: 'bg-cyan-500',
  testimonial: 'bg-pink-500',
  cta: 'bg-amber-500',
  intro: 'bg-purple-500',
  main: 'bg-indigo-500',
  conclusion: 'bg-gray-500',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function QualityBar({ value, max = 10 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = value >= 7 ? 'bg-green-500' : value >= 4 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-gray-400 font-mono w-8 text-left">{value}/{max}</span>
    </div>
  );
}

function QualityLabel({ value }: { value: string }) {
  const info = qualityLabels[value] || { text: value, color: 'text-gray-400' };
  return <span className={`${info.color} font-medium`}>{info.text}</span>;
}

export default function ContentIntelligencePanel({ intelligence }: { intelligence: VideoIntelligence }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const intel = intelligence;
  const sortedKeyPoints = [...(intel.keyPoints || [])].sort((a, b) => b.importance - a.importance);
  const totalStructureDuration = intel.storyArc.suggestedStructure.reduce(
    (sum, s) => sum + (s.end - s.start), 0
  );

  return (
    <div className="space-y-4">
      {/* Edge case warnings */}
      {intel.edgeCases?.warnings && intel.edgeCases.warnings.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/30 rounded-xl p-3">
          {intel.edgeCases.warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-400 flex items-start gap-2">
              <span className="flex-shrink-0">&#9888;</span>
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Concept */}
      <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-accent-purple-light mb-3 flex items-center gap-2">
          <span className="text-lg">📊</span>
          ניתוח תוכן מתקדם
        </h3>

        <div className="mb-3">
          <p className="text-xs text-gray-500 mb-1">📌 על מה הסרטון</p>
          <p className="text-sm text-white font-medium mb-1">{intel.concept.title}</p>
          <p className="text-xs text-gray-400 leading-relaxed">{intel.concept.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
            🏷️ {categoryLabels[intel.concept.category] || intel.concept.category}
          </span>
          <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
            🎯 {intel.concept.targetAudience}
          </span>
          <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
            🎭 {toneLabels[intel.concept.tone] || intel.concept.tone}
          </span>
          {intel.concept.industry && intel.concept.industry !== 'general' && (
            <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
              🏢 {intel.concept.industry}
            </span>
          )}
        </div>
      </div>

      {/* Key Points */}
      {sortedKeyPoints.length > 0 && (
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
          <h3 className="text-xs text-gray-500 mb-3">📝 נקודות מפתח ({sortedKeyPoints.length})</h3>
          <div className="space-y-2">
            {sortedKeyPoints.map((kp, i) => {
              const stars = kp.importance >= 8 ? '⭐⭐⭐' : kp.importance >= 6 ? '⭐⭐' : '⭐';
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 border transition-colors ${
                    kp.importance >= 7
                      ? 'bg-green-500/5 border-green-500/20'
                      : kp.importance >= 4
                      ? 'bg-gray-800/50 border-dark-border-light'
                      : 'bg-red-500/5 border-red-500/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] flex-shrink-0 mt-0.5">{stars}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium">
                        <span className="text-gray-500 font-mono">{kp.importance}/10</span>
                        {' — '}
                        "{kp.point}"
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                        <span>🕐 {formatTime(kp.timestamp)}</span>
                        <span>סוג: {kp.type}</span>
                        {kp.suggestedVisual && <span>📹 {kp.suggestedVisual}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Story Structure */}
      {intel.storyArc.suggestedStructure.length > 0 && (
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
          <h3 className="text-xs text-gray-500 mb-3">🏗️ מבנה מומלץ לסרטון</h3>

          {/* Visual timeline bar */}
          <div className="flex h-10 rounded-lg overflow-hidden mb-2">
            {intel.storyArc.suggestedStructure.map((section, i) => {
              const width = totalStructureDuration > 0
                ? ((section.end - section.start) / totalStructureDuration) * 100
                : 100 / intel.storyArc.suggestedStructure.length;
              const color = sectionColors[section.section] || 'bg-gray-600';
              return (
                <div
                  key={i}
                  className={`${color} relative flex items-center justify-center cursor-pointer transition-opacity hover:opacity-80`}
                  style={{ width: `${Math.max(width, 3)}%` }}
                  title={`${section.title}: ${section.keyMessage}`}
                >
                  <span className="text-[9px] text-white font-medium truncate px-1">
                    {sectionLabels[section.section] || section.section}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Duration labels */}
          <div className="flex mb-3">
            {intel.storyArc.suggestedStructure.map((section, i) => {
              const width = totalStructureDuration > 0
                ? ((section.end - section.start) / totalStructureDuration) * 100
                : 100 / intel.storyArc.suggestedStructure.length;
              return (
                <div key={i} className="text-center" style={{ width: `${Math.max(width, 3)}%` }}>
                  <span className="text-[8px] text-gray-600">
                    {Math.round(section.end - section.start)}s
                  </span>
                </div>
              );
            })}
          </div>

          {/* Missing elements */}
          {intel.storyArc.missingElements.length > 0 && (
            <div className="space-y-1 mt-2">
              {intel.storyArc.missingElements.map((el, i) => (
                <p key={i} className="text-[11px] text-amber-400 flex items-start gap-1.5">
                  <span className="flex-shrink-0">⚠️</span>
                  חסר: {el}
                </p>
              ))}
            </div>
          )}

          {/* Suggested additions */}
          {intel.storyArc.suggestedAdditions.length > 0 && (
            <div className="mt-2 space-y-1">
              {intel.storyArc.suggestedAdditions.map((add, i) => (
                <p key={i} className="text-[11px] text-green-400 flex items-start gap-1.5">
                  <span className="flex-shrink-0">✨</span>
                  {add.suggestion}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footage Quality */}
      <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
        <button
          className="w-full text-right"
          onClick={() => setExpandedSection(expandedSection === 'quality' ? null : 'quality')}
        >
          <h3 className="text-xs text-gray-500 mb-0 flex items-center gap-2">
            📹 איכות חומר גלם
            <span className="text-[10px] mr-auto text-gray-600">
              {expandedSection === 'quality' ? '▲' : '▼'}
            </span>
          </h3>
        </button>

        {/* Always show summary */}
        <div className="mt-3 space-y-2">
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-gray-400">וידאו</span>
            </div>
            <QualityBar value={intel.footageAssessment.overallQuality} />
          </div>
        </div>

        {/* Expanded details */}
        {expandedSection === 'quality' && (
          <div className="mt-3 space-y-2 pt-2 border-t border-dark-border-light">
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">תאורה:</span>
                <QualityLabel value={intel.footageAssessment.videoQuality.lighting} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">יציבות:</span>
                <QualityLabel value={intel.footageAssessment.videoQuality.stability} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">מסגור:</span>
                <QualityLabel value={intel.footageAssessment.videoQuality.framing} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">רקע:</span>
                <QualityLabel value={intel.footageAssessment.videoQuality.background} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">בהירות שמע:</span>
                <QualityLabel value={intel.footageAssessment.audioQuality.clarity} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">רעש רקע:</span>
                <QualityLabel value={intel.footageAssessment.audioQuality.backgroundNoise} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">עוצמה:</span>
                <QualityLabel value={intel.footageAssessment.audioQuality.volume} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">הד:</span>
                <span className={intel.footageAssessment.audioQuality.echo ? 'text-red-400 font-medium' : 'text-green-400 font-medium'}>
                  {intel.footageAssessment.audioQuality.echo ? 'יש' : 'אין'}
                </span>
              </div>
            </div>

            {/* Issues */}
            {intel.footageAssessment.issues.length > 0 && (
              <div className="mt-2">
                {intel.footageAssessment.issues.map((issue, i) => (
                  <p key={i} className="text-[10px] text-red-400 flex items-start gap-1">
                    <span>&#x2022;</span> {issue}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Content Density */}
      <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
        <h3 className="text-xs text-gray-500 mb-2">📊 צפיפות תוכן</h3>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-gray-400 font-mono">
              {formatTime(intel.contentDensity.totalFootageDuration)}
            </div>
            <div className="text-[10px] text-gray-600">צולם</div>
          </div>
          <div className="text-gray-700">→</div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-green-400 font-mono">
              {formatTime(intel.contentDensity.usableContentDuration)}
            </div>
            <div className="text-[10px] text-gray-600">שמיש</div>
          </div>
          <div className="text-center flex-1">
            <div className="text-lg font-bold text-red-400 font-mono">
              {Math.round(intel.contentDensity.wastePercentage)}%
            </div>
            <div className="text-[10px] text-gray-600">ייחתך</div>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 text-center mt-2">{intel.contentDensity.recommendation}</p>
      </div>

      {/* Smart B-Roll Plan */}
      {intel.smartBRollPlan && intel.smartBRollPlan.length > 0 && (
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
          <h3 className="text-xs text-gray-500 mb-3">
            🎬 B-Roll מתוכנן ({intel.smartBRollPlan.length} קליפים)
          </h3>
          <div className="space-y-2">
            {intel.smartBRollPlan.map((broll, i) => {
              const priorityColors: Record<string, string> = {
                'must-have': 'border-green-500/30 bg-green-500/5',
                'nice-to-have': 'border-blue-500/20 bg-blue-500/5',
                'optional': 'border-gray-700 bg-gray-800/30',
              };
              const priorityLabels: Record<string, string> = {
                'must-have': 'חובה',
                'nice-to-have': 'מומלץ',
                'optional': 'אופציונלי',
              };
              return (
                <div
                  key={i}
                  className={`rounded-lg p-3 border ${priorityColors[broll.priority] || 'border-dark-border-light'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-white font-medium">{broll.reason}</p>
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        🕐 {formatTime(broll.timestamp)} ({broll.duration}s)
                      </p>
                    </div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                      broll.priority === 'must-have'
                        ? 'bg-green-500/20 text-green-400'
                        : broll.priority === 'nice-to-have'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-700 text-gray-500'
                    }`}>
                      {priorityLabels[broll.priority] || broll.priority}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Text Overlay Plan */}
      {intel.textOverlayPlan && intel.textOverlayPlan.length > 0 && (
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
          <h3 className="text-xs text-gray-500 mb-3">✏️ טקסטים מתוכננים</h3>
          <div className="space-y-1.5">
            {intel.textOverlayPlan.map((overlay, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-gray-600 font-mono w-10 flex-shrink-0">
                  {formatTime(overlay.timestamp)}
                </span>
                <span className="text-white flex-1 truncate">"{overlay.text}"</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 flex-shrink-0">
                  {overlay.type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-Fixes */}
      {intel.footageAssessment.autoFixes.length > 0 && (
        <div className="bg-dark-card border border-green-500/20 rounded-xl p-4">
          <h3 className="text-xs text-green-400 mb-2">🔧 תיקונים אוטומטיים</h3>
          <div className="space-y-1">
            {intel.footageAssessment.autoFixes.map((fix, i) => (
              <p key={i} className="text-[11px] text-gray-300 flex items-center gap-1.5">
                <span className="text-green-500">✅</span> {fix}
              </p>
            ))}
            {intel.smartBRollPlan.length > 0 && (
              <p className="text-[11px] text-gray-300 flex items-center gap-1.5">
                <span className="text-green-500">✅</span>
                {intel.smartBRollPlan.filter(b => b.priority !== 'optional').length} קליפי B-Roll ממחישים
              </p>
            )}
            {intel.textOverlayPlan.length > 0 && (
              <p className="text-[11px] text-gray-300 flex items-center gap-1.5">
                <span className="text-green-500">✅</span>
                {intel.textOverlayPlan.length} טקסטים על המסך
              </p>
            )}
            {Math.round(intel.contentDensity.wastePercentage) > 0 && (
              <p className="text-[11px] text-gray-300 flex items-center gap-1.5">
                <span className="text-green-500">✅</span>
                חיתוך {Math.round(intel.contentDensity.wastePercentage)}% חומר לא רלוונטי
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
