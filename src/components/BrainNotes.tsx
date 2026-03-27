interface Props {
  notes: string[];
  onAcceptSuggestion?: (note: string) => void;
}

export default function BrainNotes({ notes, onAcceptSuggestion }: Props) {
  // Filter out "removed"/"disabled"/"declined" messages — only show active items
  const activeNotes = (notes || []).filter(note => {
    const lower = note.toLowerCase();
    return !lower.includes('הסיר') &&
      !lower.includes('ביטל') &&
      !lower.includes('הסירה') &&
      !lower.includes('removed') &&
      !lower.includes('disabled') &&
      !lower.includes('declined') &&
      !lower.includes('המשתמש הסיר');
  });

  if (activeNotes.length === 0) return null;

  return (
    <div className="bg-dark-card border border-teal-500/30 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-teal-300 mb-3 flex items-center gap-2">
        <span className="text-lg">💡</span>
        הערות המוח
      </h3>
      <div className="space-y-2">
        {activeNotes.map((note, i) => {
          const isPositive = note.includes('מתאים') || note.includes('👍');
          return (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm ${
                isPositive
                  ? 'bg-green-500/5 border border-green-500/20'
                  : 'bg-amber-500/5 border border-amber-500/20'
              }`}
            >
              <span className="flex-shrink-0 mt-0.5">{isPositive ? '👍' : '💭'}</span>
              <p className={`flex-1 text-xs ${isPositive ? 'text-green-300' : 'text-amber-300'}`}>
                {note}
              </p>
              {!isPositive && onAcceptSuggestion && (
                <button
                  onClick={() => onAcceptSuggestion(note)}
                  className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/20 hover:bg-teal-500/30 transition-colors"
                >
                  הפעל
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
