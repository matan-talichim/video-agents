import type { PresetType, PresetAutoConfig, EditStyle } from '../types';

interface Props {
  selected: PresetType;
  onSelect: (preset: PresetType, text: string, autoConfig?: PresetAutoConfig) => void;
}

interface PresetDef {
  id: PresetType;
  label: string;
  icon: string;
  promptText: string;
  autoConfig?: PresetAutoConfig;
}

const PRESETS: PresetDef[] = [
  {
    id: 'instagram_ad',
    label: 'פרסומת אינסטגרם',
    icon: '📱',
    promptText: 'צור פרסומת קצרה ואנרגטית לאינסטגרם עם טקסט מושך, מוזיקה קצבית ו-CTA ברור. מתאים לפיד ולריליז.',
    autoConfig: {
      duration: 30,
      editStyle: 'energetic' as EditStyle,
      formats: ['9:16', '1:1'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        energeticMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        musicSync: true,
        aiSoundEffects: true,
        kineticTypography: true,
        trendy: true,
        trendingSounds: true,
        eyeContact: true,
        outro: true,
        lowerThirds: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.35-0.80',
    },
  },
  {
    id: 'promo',
    label: 'סרטון תדמית',
    icon: '🎬',
    promptText: 'צור סרטון תדמית מקצועי וסינמטי שמציג את המותג בצורה אלגנטית. כולל מוזיקה מרגשת, מעברים חלקים וטקסט מינימלי.',
    autoConfig: {
      duration: 60,
      editStyle: 'cinematic' as EditStyle,
      formats: ['16:9'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        calmMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        cinematic: true,
        backgroundBlur: true,
        lowerThirds: true,
        eyeContact: true,
        aiSoundEffects: true,
        intro: true,
        outro: true,
        logoWatermark: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.40-1.20',
    },
  },
  {
    id: 'product',
    label: 'מכירת מוצר',
    icon: '🛍️',
    promptText: 'צור סרטון מכירה למוצר עם הדגשת יתרונות, עדויות, מחיר וכפתור רכישה. סגנון משכנע וישיר.',
    autoConfig: {
      duration: 30,
      editStyle: 'energetic' as EditStyle,
      formats: ['9:16', '1:1'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        energeticMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        musicSync: true,
        aiSoundEffects: true,
        kineticTypography: true,
        trendy: true,
        eyeContact: true,
        outro: true,
        lowerThirds: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.40-0.90',
    },
  },
  {
    id: 'tiktok',
    label: 'טיקטוק',
    icon: '🎵',
    promptText: 'צור סרטון טיקטוק ויראלי עם הוק חזק, קצב מהיר, טרנדים עדכניים וכתוביות בולטות. פורמט אנכי.',
    autoConfig: {
      duration: 15,
      editStyle: 'trendy' as EditStyle,
      formats: ['9:16'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        energeticMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        musicSync: true,
        aiSoundEffects: true,
        kineticTypography: true,
        trendy: true,
        trendingSounds: true,
        eyeContact: true,
        outro: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.25-0.60',
    },
  },
  {
    id: 'real_estate',
    label: 'נדל"ן',
    icon: '🏠',
    promptText: 'צור סרטון נדל"ן מקצועי עם סיור וירטואלי בנכס, מוזיקה אלגנטית, פרטי הנכס וקריאה ליצירת קשר.',
    autoConfig: {
      duration: 60,
      editStyle: 'cinematic' as EditStyle,
      formats: ['16:9', '9:16'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        calmMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        cinematic: true,
        lowerThirds: true,
        eyeContact: true,
        intro: true,
        outro: true,
        logoWatermark: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.60-1.80',
    },
  },
  {
    id: 'testimonials',
    label: 'עדויות',
    icon: '💬',
    promptText: 'צור סרטון עדויות לקוחות עם ציטוטים, תמונות לקוחות, דירוג כוכבים ומוזיקה נעימה. מבנה אמין ומקצועי.',
    autoConfig: {
      duration: 60,
      editStyle: 'minimal' as EditStyle,
      formats: ['16:9', '9:16'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        calmMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        calmProfessional: true,
        backgroundBlur: true,
        lowerThirds: true,
        eyeContact: true,
        aiSoundEffects: true,
        thumbnailGeneration: true,
        viralityScore: true,
      },
      estimatedCost: '$0.30-0.80',
    },
  },
  {
    id: 'freeform',
    label: 'חופשי',
    icon: '✏️',
    promptText: '',
  },
  {
    id: 'multi_story',
    label: 'סטורי מרובה דפים',
    icon: '📖',
    promptText: 'צור סדרת סטוריז לאינסטגרם עם מעבר חלק בין דפים, טקסט קריא, אנימציות עדינות ו-CTA בדף האחרון.',
    autoConfig: {
      duration: 15,
      editStyle: 'trendy' as EditStyle,
      formats: ['9:16'],
      storyPages: 3,
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        energeticMusic: true,
        soundEffects: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        trendingSounds: true,
        kineticTypography: true,
        musicSync: true,
        trendy: true,
        eyeContact: true,
        outro: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.50-1.50',
    },
  },
  {
    id: 'from_document',
    label: 'סרטון ממסמך',
    icon: '📄',
    promptText: 'צור סרטון על בסיס המסמך המצורף. חלץ את הנקודות העיקריות והפוך אותן לסרטון ויזואלי מרתק.',
    autoConfig: {
      duration: 60,
      editStyle: 'cinematic' as EditStyle,
      formats: ['16:9'],
      options: {
        removeSilences: true,
        addBRoll: true,
        hebrewSubtitles: true,
        backgroundMusic: true,
        calmMusic: true,
        colorCorrection: true,
        autoZoom: true,
        transitions: true,
        cinematic: true,
        lowerThirds: true,
        aiSoundEffects: true,
        eyeContact: true,
        viralityScore: true,
        thumbnailGeneration: true,
      },
      estimatedCost: '$0.60-1.80',
    },
  },
  {
    id: 'dubbing',
    label: 'דיבוב ותרגום',
    icon: '🌍',
    promptText: 'תרגם ודבב את הסרטון לשפה הנבחרת. שמור על סנכרון שפתיים וטון הדובר המקורי.',
    autoConfig: {
      duration: 'auto',
      formats: ['16:9'],
      targetLanguage: 'en',
      options: {
        removeSilences: true,
        hebrewSubtitles: true,
      },
      estimatedCost: '$0.50-1.00',
    },
  },
];

export default function PresetSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">תבנית</label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelect(p.id, p.promptText, p.autoConfig)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm transition-all relative ${
              selected === p.id
                ? 'border-accent-purple bg-accent-purple/10 text-white'
                : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="text-lg">{p.icon}</span>
            <span className="text-xs text-center leading-tight">{p.label}</span>
            {p.autoConfig && (
              <>
                <span className="text-[9px] text-accent-purple-light/70 mt-0.5">
                  {Object.values(p.autoConfig.options).filter(Boolean).length} אפשרויות פעילות
                </span>
                <span className="text-[9px] font-mono text-amber-400/80">
                  {p.autoConfig.estimatedCost}
                </span>
              </>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export { PRESETS };
