interface Props {
  count: number;
  onSelect: (count: number) => void;
}

const COUNTS = [3, 4, 5];

export default function StoryPageCount({ count, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">מספר דפים בסטורי</label>
      <div className="flex gap-2">
        {COUNTS.map((c) => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className={`rounded-xl border px-6 py-2.5 text-sm font-medium transition-all ${
              count === c
                ? 'border-accent-purple gradient-purple text-white'
                : 'border-dark-border-light bg-dark-card text-gray-400 hover:border-gray-500'
            }`}
          >
            {c} דפים
          </button>
        ))}
      </div>
    </div>
  );
}
