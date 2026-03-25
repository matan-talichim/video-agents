import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  role: 'user' | 'system';
  text: string;
}

interface Props {
  onSend: (message: string) => Promise<string>;
}

export default function ChatEditor({ onSend }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', text: 'שלום! אני העורך החכם. ספר לי מה לשנות בסרטון.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'system', text: 'מעבד...' }]);

    const response = await onSend(userMsg);

    setMessages((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { role: 'system', text: response };
      return updated;
    });
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-80">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 px-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-accent-purple/20 text-white'
                  : 'bg-gray-800 text-gray-300'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="למשל: הפוך את הכתוביות לגדולות יותר..."
          disabled={loading}
          className="flex-1 bg-dark-bg border border-dark-border-light rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="gradient-purple px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
        >
          שלח
        </button>
      </div>
    </div>
  );
}
