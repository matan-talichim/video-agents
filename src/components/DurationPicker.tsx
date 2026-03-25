interface Props {
  selected: number | undefined;
  onSelect: (duration: number | undefined) => void;
}

const DURATIONS: { value: number | undefined; label: string }[] = [
  { value: 15, label: '15 שניות' },
  { value: 30, label: '30 שניות' },
  { value: 60, label: '60 שניות' },
  { value: 90, label: '90 שניות' },
  { value: undefined, label: 'AI בוחר' },
];

export default function DurationPicker({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">משך הסרטון</label>
      <div className="flex gap-2 flex-wrap">
        {DURATIONS.map((d) => (
          <button
            key={d.label}
            onClick={() => onSelect(d.value)}
            className={`rounded-xl border px-5 py-2.5 text-sm font-medium transition-all ${
              selected === d.value
                ? 'border-accent-purple gradient-purple text-white glow-purple'
                : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-500'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
