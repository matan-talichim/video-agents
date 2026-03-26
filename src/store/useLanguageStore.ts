import { create } from 'zustand';

type Language = 'he' | 'en';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: () => 'rtl' | 'ltr';
}

const translations: Record<string, Record<Language, string>> = {
  'app.title': { he: 'סטודיו AI — עורך וידאו', en: 'AI Studio — Video Editor' },
  'nav.home': { he: 'דף הבית', en: 'Home' },
  'nav.newProject': { he: 'פרויקט חדש', en: 'New Project' },
  'nav.settings': { he: 'הגדרות', en: 'Settings' },
  'upload.title': { he: 'העלאת סרטון', en: 'Upload Video' },
  'upload.drag': { he: 'גרור סרטון לכאן או לחץ לבחירה', en: 'Drag video here or click to select' },
  'upload.processing': { he: 'מעבד...', en: 'Processing...' },
  'preview.title': { he: 'תצוגה מקדימה', en: 'Preview' },
  'preview.approve': { he: 'אשר ורנדר', en: 'Approve & Render' },
  'preview.effects': { he: 'אפקטים מתוכננים', en: 'Planned Effects' },
  'preview.cuts': { he: 'חיתוכים', en: 'Cuts' },
  'preview.zooms': { he: 'זומים', en: 'Zooms' },
  'preview.broll': { he: 'B-Roll', en: 'B-Roll' },
  'preview.speedRamps': { he: 'Speed Ramps', en: 'Speed Ramps' },
  'preview.cost': { he: 'עלות משוערת', en: 'Estimated Cost' },
  'preview.addNote': { he: 'הוסף הערה', en: 'Add Note' },
  'result.title': { he: 'תוצאה', en: 'Result' },
  'result.download': { he: 'הורדה', en: 'Download' },
  'result.abTest': { he: 'גרסאות A/B', en: 'A/B Variations' },
  'result.qa': { he: 'בדיקת איכות', en: 'Quality Check' },
  'result.retention': { he: 'שימור צופים', en: 'Retention' },
  'result.engagement': { he: 'חיזוי ביצועים', en: 'Engagement Prediction' },
  'common.loading': { he: 'טוען...', en: 'Loading...' },
  'common.error': { he: 'שגיאה', en: 'Error' },
  'common.save': { he: 'שמור', en: 'Save' },
  'common.cancel': { he: 'ביטול', en: 'Cancel' },
  'common.back': { he: 'חזרה', en: 'Back' },
  'common.language': { he: 'שפה', en: 'Language' },
  'format.vertical': { he: 'אנכי (9:16)', en: 'Vertical (9:16)' },
  'format.horizontal': { he: 'אופקי (16:9)', en: 'Horizontal (16:9)' },
  'format.square': { he: 'ריבועי (1:1)', en: 'Square (1:1)' },
};

const useLanguageStore = create<LanguageState>((set, get) => ({
  language: (typeof localStorage !== 'undefined'
    ? (localStorage.getItem('app-language') as Language) || 'he'
    : 'he') as Language,

  setLanguage: (lang: Language) => {
    set({ language: lang });
    localStorage.setItem('app-language', lang);
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  },

  t: (key: string) => {
    const lang = get().language;
    return translations[key]?.[lang] || key;
  },

  dir: () => (get().language === 'he' ? 'rtl' : 'ltr'),
}));

export default useLanguageStore;
