import type { CaptionTemplate } from '../types';

interface Props {
  selected: CaptionTemplate;
  onSelect: (template: CaptionTemplate) => void;
}

const TEMPLATES: { id: CaptionTemplate; name: string; style: string }[] = [
  { id: 'classic', name: 'קלאסי', style: 'bg-black/80 text-white px-3 py-1 rounded' },
  { id: 'bold', name: 'בולט', style: 'bg-yellow-500 text-black px-3 py-1 rounded font-extrabold' },
  { id: 'neon', name: 'ניאון', style: 'text-green-400 px-3 py-1 font-bold [text-shadow:0_0_10px_#22c55e]' },
  { id: 'gradient', name: 'גרדיאנט', style: 'bg-gradient-to-l from-purple-500 to-pink-500 bg-clip-text text-transparent px-3 py-1 font-bold' },
  { id: 'outline', name: 'קו מתאר', style: 'text-white px-3 py-1 font-bold [-webkit-text-stroke:1px_#7c3aed]' },
  { id: 'shadow', name: 'צל', style: 'text-white px-3 py-1 font-bold [text-shadow:3px_3px_6px_rgba(0,0,0,0.8)]' },
  { id: 'box', name: 'קופסה', style: 'bg-accent-purple text-white px-4 py-1.5 rounded-lg font-semibold' },
  { id: 'typewriter', name: 'מכונת כתיבה', style: 'bg-dark-card text-green-400 px-3 py-1 font-mono border border-green-400/30 rounded' },
  { id: 'karaoke', name: 'קריוקי', style: 'text-white px-3 py-1 font-bold bg-gradient-to-l from-blue-500 via-white to-white bg-clip-text text-transparent' },
  { id: 'minimal', name: 'מינימלי', style: 'text-gray-300 px-3 py-1 text-sm' },
];

export default function CaptionTemplatePicker({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">סגנון כתוביות</label>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex-shrink-0 rounded-xl border p-3 min-w-[120px] transition-all ${
              selected === t.id
                ? 'border-accent-purple bg-accent-purple/10'
                : 'border-dark-border-light bg-dark-card hover:border-gray-500'
            }`}
          >
            <p className="text-xs text-gray-400 mb-2 text-center">{t.name}</p>
            <div className="flex items-center justify-center h-8">
              <span className={t.style}>שלום</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
