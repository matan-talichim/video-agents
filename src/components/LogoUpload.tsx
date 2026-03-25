import { useRef } from 'react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function LogoUpload({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">לוגו (אופציונלי)</label>
      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="border border-dashed border-dark-border-light rounded-xl px-4 py-3 text-gray-400 text-sm hover:border-accent-purple/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".png,.svg,.jpg,.jpeg"
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          🏷️ לחץ להעלאת לוגו (PNG, SVG, JPG)
        </button>
      ) : (
        <div className="flex items-center gap-3 bg-dark-card border border-dark-border-light rounded-xl px-4 py-3">
          <span className="text-sm">🏷️</span>
          <span className="text-sm truncate flex-1">{file.name}</span>
          <button
            onClick={() => onChange(null)}
            className="text-gray-500 hover:text-red-400 transition-colors"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
