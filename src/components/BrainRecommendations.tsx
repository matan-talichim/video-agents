import { useState } from 'react';
import type { RecommendedConfig } from '../types';

interface Props {
  config: RecommendedConfig;
  onApply: () => void;
  onEditManually: () => void;
  applied: boolean;
}

const modelLabels: Record<string, string> = {
  'veo-3.1-fast': 'Veo 3.1 Fast',
  'sora-2': 'Sora 2',
  'kling-v2.5-turbo': 'Kling v2.5 Turbo',
  'wan-2.5': 'Wan 2.5',
  'seedance-1.5-pro': 'Seedance 1.5 Pro',
};

const editStyleLabels: Record<string, string> = {
  cinematic: 'סינמטי',
  energetic: 'אנרגטי',
  minimal: 'מינימלי',
  trendy: 'טרנדי',
};

const optionLabels: Record<string, string> = {
  removeSilences: 'הסרת שתיקות',
  addBRoll: 'B-Roll',
  hebrewSubtitles: 'כתוביות עברית',
  englishSubtitles: 'כתוביות אנגלית',
  backgroundMusic: 'מוזיקת רקע',
  energeticMusic: 'מוזיקה אנרגטית',
  calmMusic: 'מוזיקה רגועה',
  soundEffects: 'אפקטים קוליים',
  colorCorrection: 'תיקון צבע',
  autoZoom: 'זום אוטומטי',
  transitions: 'מעברים',
  intro: 'אינטרו',
  outro: 'אאוטרו',
  logoWatermark: 'סימן מים',
  thumbnailGeneration: 'תמונה ממוזערת',
  viralityScore: 'ציון ויראליות',
  aiTwin: 'תאום AI',
  aiBackground: 'רקע AI',
  backgroundBlur: 'טשטוש רקע',
  cinematic: 'סינמטי',
  eyeContact: 'תיקון קשר עין',
  calmProfessional: 'רגוע ומקצועי',
  trendy: 'טרנדי',
  lowerThirds: 'שליש תחתון',
  aiSoundEffects: 'אפקטים AI',
  kineticTypography: 'טיפוגרפיה קינטית',
  musicSync: 'סנכרון מוזיקה',
  trendingSounds: 'צלילים טרנדיים',
};

export default function BrainRecommendations({ config, onApply, onEditManually, applied }: Props) {
  const [showAllOptions, setShowAllOptions] = useState(false);

  const enabledCount = Object.values(config.enabledOptions).filter(Boolean).length;
  const totalCount = Object.keys(config.enabledOptions).length;

  const confidencePercent = Math.round(config.confidence * 100);
  const confidenceColor =
    confidencePercent > 85 ? 'text-green-400' :
    confidencePercent >= 60 ? 'text-amber-400' :
    'text-orange-400';
  const confidenceBg =
    confidencePercent > 85 ? 'bg-green-500/10 border-green-500/20' :
    confidencePercent >= 60 ? 'bg-amber-500/10 border-amber-500/20' :
    'bg-orange-500/10 border-orange-500/20';
  const confidenceLabel =
    confidencePercent > 85 ? 'המוח בטוח בהמלצות' :
    confidencePercent >= 60 ? 'המוח ממליץ — כדאי לבדוק' :
    'המוח לא בטוח — מומלץ לבחור ידנית';

  return (
    <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-xl">🧠</span>
          המלצות המוח
        </h3>
        <span className={`text-[11px] px-2.5 py-1 rounded-full border ${confidenceBg}`}>
          <span className={confidenceColor}>{confidenceLabel} ({confidencePercent}%)</span>
        </span>
      </div>

      {/* Main recommendations grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Model */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">מודל</div>
          <div className="text-sm text-white font-medium">{modelLabels[config.model] || config.model}</div>
          <div className="text-[10px] text-accent-purple-light mt-1 flex items-start gap-1">
            <span className="flex-shrink-0">💡</span>
            <span>{config.modelReason}</span>
          </div>
        </div>

        {/* Edit Style */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">סגנון</div>
          <div className="text-sm text-white font-medium">{editStyleLabels[config.editStyle] || config.editStyle}</div>
          <div className="text-[10px] text-accent-purple-light mt-1 flex items-start gap-1">
            <span className="flex-shrink-0">💡</span>
            <span>{config.editStyleReason}</span>
          </div>
        </div>

        {/* Duration */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">משך</div>
          <div className="text-sm text-white font-medium">{config.suggestedDuration} שניות</div>
          <div className="text-[10px] text-accent-purple-light mt-1 flex items-start gap-1">
            <span className="flex-shrink-0">💡</span>
            <span>{config.durationReason}</span>
          </div>
        </div>

        {/* Subtitle Style */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="text-[10px] text-gray-500 mb-1">כתוביות</div>
          <div className="text-sm text-white font-medium">{config.subtitleStyle}</div>
          <div className="text-[10px] text-accent-purple-light mt-1 flex items-start gap-1">
            <span className="flex-shrink-0">💡</span>
            <span>{config.subtitleStyleReason}</span>
          </div>
        </div>
      </div>

      {/* Options summary */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] text-gray-500">
            הופעלו {enabledCount} מתוך {totalCount} אפשרויות
          </div>
          <button
            onClick={() => setShowAllOptions(!showAllOptions)}
            className="text-[10px] text-accent-purple-light hover:underline"
          >
            {showAllOptions ? 'הסתר פרטים' : 'הצג פרטים'}
          </button>
        </div>

        {showAllOptions && (
          <div className="space-y-1.5 mt-3 max-h-64 overflow-y-auto">
            {Object.entries(config.enabledOptions).map(([key, enabled]) => (
              <div
                key={key}
                className={`flex items-start gap-2 text-[11px] rounded-lg px-2.5 py-1.5 ${
                  enabled
                    ? 'bg-green-500/5 border border-green-500/15'
                    : 'bg-gray-800/30 border border-gray-700/30'
                }`}
              >
                <span className={`flex-shrink-0 mt-0.5 ${enabled ? 'text-green-400' : 'text-gray-600'}`}>
                  {enabled ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <span className={enabled ? 'text-white' : 'text-gray-500'}>
                    {optionLabels[key] || key}
                  </span>
                  {config.optionReasons[key] && (
                    <p className={`text-[10px] mt-0.5 ${enabled ? 'text-gray-400' : 'text-gray-600'}`}>
                      {config.optionReasons[key]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formats & Cost */}
      <div className="flex items-center justify-between text-sm mb-4">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-500">פורמט:</span>
          <div className="flex gap-1">
            {config.formats.map((fmt) => (
              <span
                key={fmt}
                className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20"
              >
                {fmt}
              </span>
            ))}
          </div>
        </div>
        <div className="text-amber-400 font-bold font-mono">
          ${config.estimatedCost.toFixed(2)}
        </div>
      </div>

      {/* Format reason */}
      <div className="text-[10px] text-gray-500 mb-4 flex items-start gap-1">
        <span className="flex-shrink-0">💡</span>
        <span>{config.formatReason}</span>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onApply}
          disabled={applied}
          className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all ${
            applied
              ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-default'
              : 'gradient-purple hover:opacity-90 glow-purple cursor-pointer'
          }`}
        >
          {applied ? '✓ המלצות אושרו' : 'אשר המלצות 🚀'}
        </button>
        <button
          onClick={onEditManually}
          className="flex-1 py-3 rounded-xl font-bold text-sm bg-gray-800 text-gray-300 border border-dark-border-light hover:bg-gray-700 transition-colors"
        >
          שנה ידנית ✏️
        </button>
      </div>

      {/* Hint */}
      <p className="text-[10px] text-gray-600 mt-3 text-center">
        אתה תמיד יכול לשנות — המוח רק ממליץ
      </p>
    </div>
  );
}
