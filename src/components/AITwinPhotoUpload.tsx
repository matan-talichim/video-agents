import { useRef, useState, useEffect } from 'react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

export default function AITwinPhotoUpload({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">תמונת AI Twin (אופציונלי)</label>
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          className="border border-dashed border-dark-border-light rounded-xl p-4 text-center cursor-pointer hover:border-accent-purple/50 transition-colors"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            onChange={(e) => {
              if (e.target.files?.[0]) onChange(e.target.files[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          <p className="text-gray-400 text-sm">🤳 העלה תמונת סלפי ליצירת דובר דיגיטלי</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-dark-card border border-dark-border-light rounded-xl px-4 py-3">
          {preview && (
            <img
              src={preview}
              alt="תצוגה מקדימה"
              className="w-12 h-12 rounded-lg object-cover"
            />
          )}
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
