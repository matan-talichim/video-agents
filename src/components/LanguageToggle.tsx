import useLanguageStore from '../store/useLanguageStore';

export default function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore();

  return (
    <button
      onClick={() => setLanguage(language === 'he' ? 'en' : 'he')}
      className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-white text-xs cursor-pointer flex items-center gap-1.5 hover:bg-white/15 transition-colors"
    >
      {language === 'he' ? 'EN' : 'HE'}
    </button>
  );
}
