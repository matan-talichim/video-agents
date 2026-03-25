import type { PresetType } from '../types';

interface Props {
  selected: PresetType;
  onSelect: (preset: PresetType, text: string) => void;
}

const PRESETS: { id: PresetType; label: string; icon: string; promptText: string }[] = [
  {
    id: 'instagram_ad',
    label: 'פרסומת אינסטגרם',
    icon: '📱',
    promptText: 'צור פרסומת אינסטגרם קצרה ואנרגטית עם טקסט מושך, מוזיקה קצבית ו-CTA ברור. מתאים לפיד ולריליז.',
  },
  {
    id: 'promo',
    label: 'סרטון תדמית',
    icon: '🎬',
    promptText: 'צור סרטון תדמית מקצועי וסינמטי שמציג את המותג בצורה אלגנטית. כולל מוזיקה מרגשת, מעברים חלקים וטקסט מינימלי.',
  },
  {
    id: 'product',
    label: 'מכירת מוצר',
    icon: '🛍️',
    promptText: 'צור סרטון מכירה למוצר עם הדגשת יתרונות, עדויות, מחיר וכפתור רכישה. סגנון משכנע וישיר.',
  },
  {
    id: 'tiktok',
    label: 'טיקטוק',
    icon: '🎵',
    promptText: 'צור סרטון טיקטוק ויראלי עם הוק חזק, קצב מהיר, טרנדים עדכניים וכתוביות בולטות. פורמט אנכי.',
  },
  {
    id: 'real_estate',
    label: 'נדל"ן',
    icon: '🏠',
    promptText: 'צור סרטון נדל"ן מקצועי עם סיור וירטואלי בנכס, מוזיקה אלגנטית, פרטי הנכס וקריאה ליצירת קשר.',
  },
  {
    id: 'testimonials',
    label: 'עדויות',
    icon: '💬',
    promptText: 'צור סרטון עדויות לקוחות עם ציטוטים, תמונות לקוחות, דירוג כוכבים ומוזיקה נעימה. מבנה אמין ומקצועי.',
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
  },
  {
    id: 'from_document',
    label: 'סרטון ממסמך',
    icon: '📄',
    promptText: 'צור סרטון על בסיס המסמך המצורף. חלץ את הנקודות העיקריות והפוך אותן לסרטון ויזואלי מרתק.',
  },
  {
    id: 'dubbing',
    label: 'דיבוב ותרגום',
    icon: '🌍',
    promptText: 'תרגם ודבב את הסרטון לשפה הנבחרת. שמור על סנכרון שפתיים וטון הדובר המקורי.',
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
            onClick={() => onSelect(p.id, p.promptText)}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-sm transition-all ${
              selected === p.id
                ? 'border-accent-purple bg-accent-purple/10 text-white'
                : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-500'
            }`}
          >
            <span className="text-lg">{p.icon}</span>
            <span className="text-xs text-center leading-tight">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
