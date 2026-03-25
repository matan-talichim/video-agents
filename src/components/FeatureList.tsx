import { useState } from 'react';
import type { CostItem } from '../types';

interface Props {
  enabledFeatures: string[];
  totalFeatures?: number;
  costEstimate?: { total: number; breakdown: Record<string, number> };
  costBreakdown?: CostItem[];
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
  'יצירת תסריט AI', 'העברת תנועה', 'בקרת מצלמה', 'צלילים טרנדיים',
  'DNA ויזואלי', 'בחירת מודל אוטומטית', 'הפרדת סטמים', 'שיפור תאורה',
];

export default function FeatureList({ enabledFeatures, totalFeatures = 95, costEstimate, costBreakdown }: Props) {
  const [open, setOpen] = useState(false);
  const [showCost, setShowCost] = useState(false);

  const totalCost = costEstimate?.total ?? 0;
  const hasCostBreakdown = costBreakdown && costBreakdown.length > 0;
  const paidItems = costBreakdown?.filter(i => !i.free) ?? [];
  const freeItems = costBreakdown?.filter(i => i.free) ?? [];

  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <span className={`transition-transform text-xs ${open ? 'rotate-90' : ''}`}>◀</span>
        הפיצ׳רים שנבחרו ({enabledFeatures.length} מתוך {totalFeatures})
      </button>

      {/* Cost Breakdown — Enhanced */}
      {(costEstimate || hasCostBreakdown) && (
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-3">
          <button
            onClick={() => setShowCost(!showCost)}
            className="flex items-center justify-between w-full text-sm"
          >
            <span className="text-gray-400">עלות משוערת</span>
            <span className={`font-mono font-bold ${totalCost === 0 ? 'text-green-400' : totalCost < 0.5 ? 'text-yellow-400' : 'text-orange-400'}`}>
              ${totalCost.toFixed(2)}
            </span>
          </button>
          {showCost && (
            <div className="mt-2 pt-2 border-t border-dark-border-light space-y-1">
              {/* Use detailed breakdown if available */}
              {hasCostBreakdown ? (
                <>
                  {/* Paid services */}
                  {paidItems
                    .sort((a, b) => b.cost - a.cost)
                    .map((item, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span className="text-gray-400">{item.service}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-600">{item.unit}</span>
                          <span className="text-amber-400 font-mono w-14 text-left">${item.cost.toFixed(3)}</span>
                        </div>
                      </div>
                    ))}
                  {/* Free services */}
                  {freeItems.length > 0 && (
                    <div className="mt-2 pt-1 border-t border-dark-border-light/50">
                      {freeItems.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-green-500/70">{item.service}</span>
                          <span className="text-green-500/70 text-[10px]">{item.unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Human editor comparison */}
                  <div className="mt-2 pt-2 border-t border-dark-border-light text-xs text-center">
                    <span className="text-gray-600">עלות עורך אנושי: </span>
                    <span className="text-gray-500 line-through">₪500+</span>
                    <span className="text-gray-600"> | עלות AI: </span>
                    <span className="text-amber-400 font-mono font-bold">${totalCost.toFixed(2)}</span>
                  </div>
                </>
              ) : (
                /* Legacy breakdown format */
                <>
                  {Object.entries(costEstimate!.breakdown)
                    .filter(([, cost]) => cost > 0)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, cost]) => (
                      <div key={name} className="flex justify-between text-xs">
                        <span className="text-gray-500">{name}</span>
                        <span className="text-gray-400 font-mono">${cost.toFixed(2)}</span>
                      </div>
                    ))}
                  {Object.entries(costEstimate!.breakdown).some(([, cost]) => cost === 0) && (
                    <div className="text-xs text-green-500/70 mt-1">
                      + שירותים חינמיים (Pexels, FFmpeg, Deepgram)
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

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
