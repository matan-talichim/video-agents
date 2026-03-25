interface Props {
  selected: string;
  onSelect: (lang: string) => void;
}

const LANGUAGES = [
  { id: 'en', label: 'אנגלית' },
  { id: 'ar', label: 'ערבית' },
  { id: 'ru', label: 'רוסית' },
  { id: 'fr', label: 'צרפתית' },
  { id: 'es', label: 'ספרדית' },
  { id: 'de', label: 'גרמנית' },
  { id: 'zh', label: 'סינית' },
];

export default function LanguageSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">שפת יעד</label>
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full bg-dark-card border border-dark-border-light rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent-purple transition-colors appearance-none cursor-pointer"
      >
        {LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}
