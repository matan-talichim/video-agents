interface Props {
  onApprove: () => void;
  onUndo: () => void;
  canUndo: boolean;
  isLoading: boolean;
}

export default function ApproveButton({ onApprove, onUndo, canUndo, isLoading }: Props) {
  return (
    <div className="flex items-center gap-3">
      {/* Undo button */}
      {canUndo && (
        <button
          onClick={onUndo}
          disabled={isLoading}
          className="px-4 py-3 rounded-xl text-sm font-medium border border-dark-border-light text-gray-400 hover:text-white hover:border-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ↩ בטל שינוי אחרון
        </button>
      )}

      {/* Approve button */}
      <button
        onClick={onApprove}
        disabled={isLoading}
        className="flex-1 py-4 rounded-2xl font-bold text-lg transition-all duration-300 gradient-purple hover:opacity-90 glow-purple cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'מעבד...' : 'אישור — התחל עריכה 🚀'}
      </button>
    </div>
  );
}
