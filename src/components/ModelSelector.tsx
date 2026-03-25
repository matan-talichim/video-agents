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
}

const MODELS: ModelInfo[] = [
  { id: 'veo3.1', name: 'Veo 3.1 Fast', speed: 3, quality: 4, cost: 2 },
  { id: 'sora2', name: 'Sora 2', speed: 2, quality: 5, cost: 3 },
  { id: 'kling2.5', name: 'Kling v2.5 Turbo', speed: 3, quality: 3, cost: 1 },
  { id: 'wan2.5', name: 'WAN 2.5', speed: 1, quality: 4, cost: 2 },
  { id: 'seedance1.5', name: 'Seedance 1.5 Pro', speed: 2, quality: 4, cost: 2 },
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
            <p className="font-semibold text-sm mb-3">{m.name}</p>
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
          </button>
        ))}
      </div>
    </div>
  );
}
