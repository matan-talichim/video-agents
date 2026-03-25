import { useRef } from 'react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function SourceDocumentUpload({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">מסמך מקור (אופציונלי)</label>
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border border-dashed border-dark-border-light rounded-xl p-4 text-center cursor-pointer hover:border-accent-purple/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          <p className="text-gray-400 text-sm">📄 העלה מסמך (PDF/Word)</p>
        </div>
      ) : (
        <div className="flex items-center justify-between bg-dark-card border border-dark-border-light rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-0.5 rounded bg-amber-600">מסמך</span>
            <span className="text-sm truncate">{file.name}</span>
          </div>
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
