import { useCallback, useRef } from 'react';

interface Props {
  files: File[];
  onChange: (files: File[]) => void;
}

const ACCEPTED = '.mp4,.mov,.avi,.mkv,.webm,.mp3,.wav,.aac,.m4a,.ogg,.flac';

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function typeBadge(type: string): { label: string; color: string } {
  if (type.startsWith('video/')) return { label: 'וידאו', color: 'bg-blue-600' };
  if (type.startsWith('audio/')) return { label: 'אודיו', color: 'bg-green-600' };
  return { label: 'קובץ', color: 'bg-gray-600' };
}

export default function FileUpload({ files, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = Array.from(e.dataTransfer.files);
      onChange([...files, ...dropped]);
    },
    [files, onChange]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        onChange([...files, ...Array.from(e.target.files)]);
      }
      e.target.value = '';
    },
    [files, onChange]
  );

  const remove = useCallback(
    (idx: number) => {
      onChange(files.filter((_, i) => i !== idx));
    },
    [files, onChange]
  );

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">קבצים</label>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-dark-border-light rounded-2xl p-8 text-center cursor-pointer hover:border-accent-purple/50 transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          onChange={handleChange}
          className="hidden"
        />
        <div className="text-4xl mb-3">📁</div>
        <p className="text-gray-400">גרור קבצים לכאן או לחץ לבחירה</p>
        <p className="text-gray-600 text-xs mt-1">וידאו, אודיו</p>
      </div>

      {files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((f, i) => {
            const badge = typeBadge(f.type);
            return (
              <div
                key={i}
                className="flex items-center justify-between bg-dark-card border border-dark-border-light rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`text-xs px-2 py-0.5 rounded ${badge.color}`}>
                    {badge.label}
                  </span>
                  <span className="truncate text-sm">{f.name}</span>
                  <span className="text-gray-500 text-xs flex-shrink-0">
                    {formatSize(f.size)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(i);
                  }}
                  className="text-gray-500 hover:text-red-400 transition-colors mr-2"
                >
                  ✕
                </button>
              </div>
            );
          })}
          <button
            onClick={() => inputRef.current?.click()}
            className="text-accent-purple-light text-sm hover:underline"
          >
            + הוסף עוד קבצים
          </button>
        </div>
      )}
    </div>
  );
}
