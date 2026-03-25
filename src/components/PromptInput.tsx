interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function PromptInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">תיאור הסרטון</label>
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="תאר את הסרטון שאתה רוצה ליצור..."
          rows={5}
          dir="rtl"
          className="w-full bg-dark-card border border-dark-border-light rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple transition-colors resize-none"
        />
        <span className="absolute bottom-3 left-3 text-xs text-gray-600">
          {value.length} תווים
        </span>
      </div>
    </div>
  );
}
