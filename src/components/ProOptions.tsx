import type { UserOptions, OptionState } from '../types';

interface Props {
  options: UserOptions;
  onToggle: (key: keyof UserOptions) => void;
  optionStates?: Record<string, OptionState>;
  animatingOptions?: Set<string>;
  activePreset?: string | null;
}

export const OPTIONS_META: { key: keyof UserOptions; icon: string; label: string; desc: string }[] = [
  { key: 'removeSilences', icon: '🔇', label: 'הסרת שקטים', desc: 'מסיר קטעים שקטים אוטומטית' },
  { key: 'addBRoll', icon: '🎞️', label: 'B-Roll', desc: 'הוספת קטעי וידאו רלוונטיים' },
  { key: 'hebrewSubtitles', icon: '📝', label: 'כתוביות עברית', desc: 'כתוביות מונפשות בעברית' },
  { key: 'englishSubtitles', icon: '🔤', label: 'כתוביות אנגלית', desc: 'כתוביות באנגלית' },
  { key: 'backgroundMusic', icon: '🎵', label: 'מוזיקת רקע', desc: 'מוזיקה אוטומטית מותאמת' },
  { key: 'energeticMusic', icon: '🎸', label: 'מוזיקה אנרגטית', desc: 'קצב מהיר ודינמי' },
  { key: 'calmMusic', icon: '🎹', label: 'מוזיקה רגועה', desc: 'מנגינה שקטה ונעימה' },
  { key: 'soundEffects', icon: '💥', label: 'אפקטי סאונד', desc: 'אפקטים קוליים חכמים' },
  { key: 'aiSoundEffects', icon: '🔊', label: 'סאונד AI', desc: 'אפקטי סאונד חכמים מ-AI' },
  { key: 'colorCorrection', icon: '🎨', label: 'תיקון צבע', desc: 'איזון צבעים אוטומטי' },
  { key: 'autoZoom', icon: '🔍', label: 'זום אוטומטי', desc: 'זום דינמי על רגעים חשובים' },
  { key: 'transitions', icon: '🔄', label: 'מעברים', desc: 'מעברים חלקים בין קטעים' },
  { key: 'musicSync', icon: '🥁', label: 'סנכרון מוזיקה', desc: 'חיתוכים מסונכרנים לביט' },
  { key: 'kineticTypography', icon: '🔤', label: 'טקסט מונפש', desc: 'טיפוגרפיה קינטית מונפשת' },
  { key: 'trendy', icon: '🔥', label: 'טרנדי', desc: 'סגנון טרנדי ועכשווי' },
  { key: 'trendingSounds', icon: '📢', label: 'סאונדים טרנדיים', desc: 'צלילים פופולריים מטרנדים' },
  { key: 'cinematic', icon: '🎥', label: 'סינמטי', desc: 'מראה קולנועי מקצועי' },
  { key: 'backgroundBlur', icon: '🌫️', label: 'טשטוש רקע', desc: 'טשטוש רקע אוטומטי' },
  { key: 'lowerThirds', icon: '📋', label: 'שם ותפקיד', desc: 'כרטיסיות שם ותפקיד' },
  { key: 'eyeContact', icon: '👁️', label: 'קשר עין', desc: 'תיקון קשר עין אוטומטי' },
  { key: 'aiBackground', icon: '🖼️', label: 'רקע AI', desc: 'החלפת רקע בינה מלאכותית' },
  { key: 'intro', icon: '🎬', label: 'אינטרו', desc: 'פתיחה מקצועית' },
  { key: 'outro', icon: '🔚', label: 'אאוטרו', desc: 'סיום עם CTA' },
  { key: 'logoWatermark', icon: '💧', label: 'סימן מים', desc: 'לוגו כסימן מים' },
  { key: 'thumbnailGeneration', icon: '🖼️', label: 'תמונה ממוזערת', desc: 'תמונת תצוגה אוטומטית' },
  { key: 'viralityScore', icon: '📊', label: 'ציון ויראליות', desc: 'ניתוח פוטנציאל ויראלי' },
  { key: 'aiTwin', icon: '🤖', label: 'AI Twin', desc: 'דובר דיגיטלי מבוסס תמונה' },
];

export const OPTIONS_LABELS: Record<string, string> = Object.fromEntries(
  OPTIONS_META.map((o) => [o.key, o.label])
);

export default function ProOptions({ options, onToggle, optionStates, animatingOptions, activePreset }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">אפשרויות מתקדמות</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        {OPTIONS_META.map((opt) => {
          const isEnabled = options[opt.key];
          const state = optionStates?.[opt.key];
          const isAnimating = animatingOptions?.has(opt.key);

          // Determine animation class for preset transitions
          let animClass = '';
          if (isAnimating && isEnabled) animClass = 'preset-turn-on';
          else if (isAnimating && !isEnabled) animClass = 'preset-turn-off';
          else if (isAnimating) animClass = 'preset-pulse';

          return (
            <button
              key={opt.key}
              onClick={() => onToggle(opt.key)}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-right transition-all relative ${animClass} ${
                isEnabled
                  ? 'border-accent-purple/50 bg-accent-purple/10'
                  : 'border-dark-border-light bg-dark-card hover:border-gray-500'
              }`}
            >
              <span className="text-lg flex-shrink-0">{opt.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-[10px] text-gray-500 leading-tight">{opt.desc}</p>
                {/* Source badges */}
                {state && (
                  <div className="mt-1">
                    {state.source === 'preset' && isEnabled && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/20">
                        🤖 תבנית
                      </span>
                    )}
                    {state.source === 'user' && isEnabled !== state.presetDefault && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/20">
                        ✏️ שינוי שלך
                      </span>
                    )}
                    {state.source === 'brain' && isEnabled && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/20">
                        🧠 המוח
                      </span>
                    )}
                    {!isEnabled && activePreset && activePreset !== 'freeform' && state.source === 'preset' && (
                      <span className="inline-block text-[9px] px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-500 border border-gray-600/20">
                        ℹ️ לא נדרש
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div
                className={`w-9 h-5 rounded-full flex-shrink-0 flex items-center transition-colors ${
                  isEnabled ? 'bg-accent-purple' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    isEnabled ? 'translate-x-1' : 'translate-x-[18px]'
                  }`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
