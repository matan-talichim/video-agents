import type { EditStyle } from '../types';

interface Props {
  selected: EditStyle;
  onSelect: (style: EditStyle) => void;
}

const STYLES: { id: EditStyle; icon: string; label: string; desc: string }[] = [
  { id: 'cinematic', icon: '🎬', label: 'סינמטי', desc: 'מעברים חלקים, תאורה דרמטית' },
  { id: 'energetic', icon: '⚡', label: 'אנרגטי', desc: 'חיתוכים מהירים, אפקטים דינמיים' },
  { id: 'minimal', icon: '✨', label: 'מינימלי', desc: 'נקי, פשוט ואלגנטי' },
  { id: 'trendy', icon: '🔥', label: 'טרנדי', desc: 'סגנון טיקטוק, אפקטים פופולריים' },
];

export default function EditStyleSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">סגנון עריכה</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`text-right rounded-xl border p-4 transition-all ${
              selected === s.id
                ? 'border-accent-purple bg-accent-purple/10'
                : 'border-dark-border-light bg-dark-card hover:border-gray-500'
            }`}
          >
            <div className="text-2xl mb-2">{s.icon}</div>
            <p className="font-semibold text-sm">{s.label}</p>
            <p className="text-gray-500 text-xs mt-1">{s.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
