import { useState } from 'react';
import type { RevisionRequest } from '../types';
import ChatEditor from './ChatEditor';

interface Props {
  jobId: string;
  onSubmitRevision: (revision: RevisionRequest) => void;
  onChatSend: (message: string) => Promise<string>;
  isLoading: boolean;
}

type Tab = 'general' | 'timestamp' | 'duration' | 'chat';

const TABS: { id: Tab; label: string }[] = [
  { id: 'general', label: 'תיקון כללי' },
  { id: 'timestamp', label: 'שניות מסוימות' },
  { id: 'duration', label: 'שינוי משך' },
  { id: 'chat', label: 'עריכה בצ\'אט' },
];

export default function RevisionPanel({ onSubmitRevision, onChatSend, isLoading }: Props) {
  const [tab, setTab] = useState<Tab>('general');
  const [generalPrompt, setGeneralPrompt] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [tsPrompt, setTsPrompt] = useState('');
  const [newDuration, setNewDuration] = useState('');

  const submitGeneral = () => {
    if (!generalPrompt.trim()) return;
    onSubmitRevision({ type: 'general', prompt: generalPrompt });
    setGeneralPrompt('');
  };

  const submitTimestamp = () => {
    if (!startTime || !endTime) return;
    onSubmitRevision({
      type: 'timestamp',
      prompt: tsPrompt,
      startTime: parseFloat(startTime),
      endTime: parseFloat(endTime),
    });
    setStartTime('');
    setEndTime('');
    setTsPrompt('');
  };

  const submitDuration = () => {
    if (!newDuration) return;
    onSubmitRevision({ type: 'duration', newDuration: parseInt(newDuration) });
    setNewDuration('');
  };

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-4">
      <h3 className="text-sm font-semibold mb-3">בקשת תיקון</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-dark-bg rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs py-2 rounded-lg transition-all ${
              tab === t.id
                ? 'gradient-purple text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'general' && (
        <div className="space-y-3">
          <textarea
            value={generalPrompt}
            onChange={(e) => setGeneralPrompt(e.target.value)}
            placeholder="תאר מה לשנות בסרטון..."
            rows={3}
            className="w-full bg-dark-bg border border-dark-border-light rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple resize-none"
          />
          <button
            onClick={submitGeneral}
            disabled={!generalPrompt.trim() || isLoading}
            className="w-full gradient-purple py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isLoading ? 'שולח...' : 'שלח תיקון'}
          </button>
        </div>
      )}

      {tab === 'timestamp' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">שנייה התחלה</label>
              <input
                type="number"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min={0}
                step={0.1}
                className="w-full bg-dark-bg border border-dark-border-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">שנייה סיום</label>
              <input
                type="number"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min={0}
                step={0.1}
                className="w-full bg-dark-bg border border-dark-border-light rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
              />
            </div>
          </div>
          <textarea
            value={tsPrompt}
            onChange={(e) => setTsPrompt(e.target.value)}
            placeholder="מה לשנות בקטע הזה..."
            rows={2}
            className="w-full bg-dark-bg border border-dark-border-light rounded-xl px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-accent-purple resize-none"
          />
          <button
            onClick={submitTimestamp}
            disabled={!startTime || !endTime || isLoading}
            className="w-full gradient-purple py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isLoading ? 'שולח...' : 'שלח תיקון לקטע'}
          </button>
        </div>
      )}

      {tab === 'duration' && (
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">משך חדש (שניות)</label>
            <input
              type="number"
              value={newDuration}
              onChange={(e) => setNewDuration(e.target.value)}
              min={5}
              max={300}
              className="w-full bg-dark-bg border border-dark-border-light rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-accent-purple"
            />
          </div>
          <button
            onClick={submitDuration}
            disabled={!newDuration || isLoading}
            className="w-full gradient-purple py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {isLoading ? 'שולח...' : 'שנה משך'}
          </button>
        </div>
      )}

      {tab === 'chat' && <ChatEditor onSend={onChatSend} />}
    </div>
  );
}
