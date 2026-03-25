import type { VoiceoverStyle } from '../types';

interface Props {
  selected: VoiceoverStyle;
  onSelect: (style: VoiceoverStyle) => void;
}

const STYLES: { id: VoiceoverStyle; icon: string; label: string }[] = [
  { id: 'narrator', icon: '🎙️', label: 'מספר' },
  { id: 'teacher', icon: '📚', label: 'מלמד' },
  { id: 'persuasive', icon: '💼', label: 'משכנע' },
  { id: 'coach', icon: '💪', label: 'מאמן' },
  { id: 'motivator', icon: '🔥', label: 'מוטיבטור' },
];

export default function VoiceoverStyleSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">סגנון קריינות</label>
      <div className="flex gap-2 flex-wrap">
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all ${
              selected === s.id
                ? 'border-accent-purple gradient-purple text-white'
                : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-500'
            }`}
          >
            <span>{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
