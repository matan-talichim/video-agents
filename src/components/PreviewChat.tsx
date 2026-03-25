import { useState } from 'react';

interface Props {
  onSend: (message: string) => void;
  isLoading: boolean;
  changeHistory: string[];
}

export default function PreviewChat({ onSend, isLoading, changeHistory }: Props) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (!trimmed || isLoading) return;
    onSend(trimmed);
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">💬</span>
        רוצה לשנות משהו?
      </h3>

      {/* Change history chips */}
      {changeHistory.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {changeHistory.map((change, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-1 rounded-full bg-accent-purple/15 text-accent-purple-light border border-accent-purple/20"
            >
              שינוי {i + 1}: {change.slice(0, 30)}{change.length > 30 ? '...' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Chat input */}
      <div className="bg-dark-card border border-dark-border-light rounded-xl p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='למשל: "תחליף מוזיקה לאנרגטית", "בלי כתוביות", "הוסף B-Roll"...'
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 outline-none"
            disabled={isLoading}
          />
          <button
            onClick={handleSubmit}
            disabled={!message.trim() || isLoading}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              message.trim() && !isLoading
                ? 'bg-accent-purple/20 text-accent-purple-light hover:bg-accent-purple/30 cursor-pointer'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'מעדכן...' : 'שלח'}
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {['מוזיקה אנרגטית', 'בלי כתוביות', 'הוסף B-Roll', 'קצב מהיר', 'סגנון סינמטי'].map(
            (suggestion) => (
              <button
                key={suggestion}
                onClick={() => setMessage(suggestion)}
                className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300 transition-colors"
                disabled={isLoading}
              >
                {suggestion}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
