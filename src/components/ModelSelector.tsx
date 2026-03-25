import type { VideoModel } from '../types';

interface Props {
  selected: VideoModel;
  onSelect: (model: VideoModel) => void;
}

interface ModelInfo {
  id: VideoModel;
  name: string;
  speed: number;
  quality: number;
  cost: number;
  costPerClip: string;
  costPerSecond: string;
  bestFor: string;
}

const MODELS: ModelInfo[] = [
  {
    id: 'veo3.1',
    name: 'Veo 3.1 Fast',
    speed: 4,
    quality: 4,
    cost: 3,
    costPerClip: '$0.40',
    costPerSecond: '$0.05/שנייה',
    bestFor: 'סינמטי, נדל"ן, טבע',
  },
  {
    id: 'sora2',
    name: 'Sora 2',
    speed: 3,
    quality: 5,
    cost: 2,
    costPerClip: '$0.15',
    costPerSecond: '$0.015/שנייה',
    bestFor: 'איכות גבוהה, סצנות מורכבות',
  },
  {
    id: 'kling2.5',
    name: 'Kling 2.1',
    speed: 5,
    quality: 3,
    cost: 1,
    costPerClip: '$0.10',
    costPerSecond: '$0.02/שנייה',
    bestFor: 'מהיר וזול, רשתות חברתיות',
  },
  {
    id: 'wan2.5',
    name: 'WAN 2.5',
    speed: 2,
    quality: 4,
    cost: 2,
    costPerClip: '$0.15',
    costPerSecond: '$0.03/שנייה',
    bestFor: 'סגנון אמנותי, אבסטרקטי',
  },
  {
    id: 'seedance1.5',
    name: 'Seedance 1.5 Pro',
    speed: 3,
    quality: 4,
    cost: 2,
    costPerClip: '$0.20',
    costPerSecond: '$0.04/שנייה',
    bestFor: 'מוצרים, e-commerce, תנועה',
  },
];

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 w-3 rounded-full ${i < value ? color : 'bg-gray-700'}`}
        />
      ))}
    </div>
  );
}

export default function ModelSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-2">מודל וידאו</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {MODELS.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`text-right rounded-xl border p-4 transition-all ${
              selected === m.id
                ? 'border-accent-purple bg-accent-purple/10 glow-purple'
                : 'border-dark-border-light bg-dark-card hover:border-gray-500'
            }`}
          >
            <p className="font-semibold text-sm mb-1">{m.name}</p>
            {/* Real pricing */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-mono text-amber-400">{m.costPerClip}/קליפ</span>
              <span className="text-[9px] text-gray-600">|</span>
              <span className="text-[9px] font-mono text-gray-500">{m.costPerSecond}</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Bar value={m.speed} max={5} color="bg-green-500" />
                <span className="text-[10px] text-gray-500">מהירות</span>
              </div>
              <div className="flex items-center justify-between">
                <Bar value={m.quality} max={5} color="bg-blue-500" />
                <span className="text-[10px] text-gray-500">איכות</span>
              </div>
              <div className="flex items-center justify-between">
                <Bar value={m.cost} max={5} color="bg-amber-500" />
                <span className="text-[10px] text-gray-500">עלות</span>
              </div>
            </div>
            {/* Best for */}
            <p className="text-[9px] text-gray-600 mt-2 leading-tight">{m.bestFor}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
