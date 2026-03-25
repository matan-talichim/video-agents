import { useState } from 'react';

interface Props {
  enabledFeatures: string[];
  totalFeatures?: number;
}

const ALL_FEATURES = [
  'זיהוי סוג קובץ', 'חילוץ אודיו', 'תמלול דיבור', 'זיהוי שפה', 'זיהוי רגשות קוליים',
  'ניתוח פנים', 'זיהוי סצנות', 'זיהוי טקסט בתמונה', 'חילוץ מטא-דאטה', 'זיהוי איכות',
  'ניתוח תוכן', 'זיהוי מוזיקה', 'ניתוח קצב דיבור',
  'תכנון סצנות', 'חלוקה לסגמנטים', 'בחירת סגנון', 'תכנון טקסט', 'תכנון מוזיקה',
  'תכנון אפקטים', 'תכנון מעברים', 'תכנון תזמון',
  'יצירת B-Roll', 'יצירת מוזיקה', 'יצירת קריינות', 'יצירת כתוביות', 'יצירת טקסט מונפש',
  'יצירת אינטרו', 'יצירת אאוטרו', 'יצירת תמונה ממוזערת', 'יצירת אפקטי סאונד',
  'שכפול קול', 'סנכרון שפתיים', 'החלפת פנים', 'אפקטים חזותיים', 'הגדלת רזולוציה',
  'יצירת דובר דיגיטלי', 'תרגום כתוביות', 'דיבוב', 'יצירת סטורי', 'יצירת מסמך לוידאו',
  'חיפוש סטוק', 'יצירת GIF', 'יצירת תמונות', 'יצירת אנימציות',
  'הסרת שקטים', 'חיתוך חכם', 'מעברים', 'תיקון צבע', 'זום אוטומטי', 'סימן מים',
  'הוספת לוגו', 'הוספת B-Roll', 'הוספת מוזיקה', 'הוספת אפקטי סאונד', 'הוספת כתוביות',
  'הוספת טקסט', 'הוספת אינטרו', 'הוספת אאוטרו', 'סנכרון מוזיקה', 'סנכרון ביט',
  'טיפוגרפיה קינטית', 'עריכת צ\'אט', 'סגנון עריכה', 'ערכת מותג', 'תבנית כתוביות',
  'עריכת סטורי', 'הוספת CTA', 'אופטימיזציה לפלטפורמה', 'קרופ אוטומטי',
  'מעברים מותאמים', 'פילטרים', 'LUT', 'הנפשת טקסט', 'אפקט Ken Burns',
  'ייצוא MP4', 'ייצוא MOV', 'ייצוא 4K', 'ייצוא אנכי', 'ייצוא מרובה פורמטים', 'ייצוא GIF',
  'שמירת גרסה', 'שחזור גרסה', 'היסטוריית גרסאות', 'השוואת גרסאות',
  'תבנית אינסטגרם', 'תבנית טיקטוק', 'תבנית יוטיוב', 'תבנית נדל"ן',
  'תבנית מוצר', 'תבנית עדויות', 'ציון ויראליות',
];

export default function FeatureList({ enabledFeatures, totalFeatures = 95 }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <span className={`transition-transform text-xs ${open ? 'rotate-90' : ''}`}>◀</span>
        הפיצ׳רים שנבחרו ({enabledFeatures.length} מתוך {totalFeatures})
      </button>

      {open && (
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
          {ALL_FEATURES.map((name, i) => {
            const isEnabled = enabledFeatures.some(
              (f) => f === name || f.toLowerCase().includes(name.slice(0, 6).toLowerCase())
            ) || i < enabledFeatures.length;
            return (
              <div
                key={i}
                className={`text-xs rounded-lg px-2 py-1.5 ${
                  isEnabled
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-gray-600 bg-dark-card'
                }`}
              >
                {isEnabled ? '✓' : '○'} {name}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
