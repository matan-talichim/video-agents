import { useState } from 'react';
import type { VideoModel } from '../types';
import { VIDEO_MODELS, RECOMMENDED_MODEL_IDS, type VideoModelInfo } from '../data/videoModels';

interface Props {
  selected: VideoModel;
  onSelect: (model: VideoModel) => void;
}

const FILTER_CHIPS = [
  { label: 'הכל', query: '' },
  { label: 'הכי זול', query: 'זול' },
  { label: 'איכות גבוהה', query: 'premium' },
  { label: 'הכי מהיר', query: 'מהיר' },
  { label: 'Kling', query: 'Kling' },
  { label: 'Google', query: 'Google' },
  { label: 'OpenAI', query: 'OpenAI' },
  { label: 'Runway', query: 'Runway' },
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

function ModelCard({
  model,
  selected,
  onSelect,
  compact,
}: {
  model: VideoModelInfo;
  selected: boolean;
  onSelect: () => void;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      className={`text-right rounded-xl border p-4 transition-all ${
        selected
          ? 'border-accent-purple bg-accent-purple/10 glow-purple'
          : 'border-dark-border-light bg-dark-card hover:border-gray-500'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="font-semibold text-sm">{model.name}</p>
        <span className="text-[10px] text-gray-500">{model.provider}</span>
      </div>

      {/* Pricing */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] font-mono text-amber-400 font-bold">
          ${model.pricePerClip.toFixed(2)}/קליפ
        </span>
        <span className="text-[9px] text-gray-600">|</span>
        <span className="text-[9px] font-mono text-gray-500">
          ${model.pricePerSecond.toFixed(3)}/שנייה
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Bar value={model.speed} max={5} color="bg-green-500" />
          <span className="text-[10px] text-gray-500">מהירות</span>
        </div>
        <div className="flex items-center justify-between">
          <Bar value={model.quality} max={5} color="bg-blue-500" />
          <span className="text-[10px] text-gray-500">איכות</span>
        </div>
        <div className="flex items-center justify-between">
          <Bar value={model.cost} max={5} color="bg-amber-500" />
          <span className="text-[10px] text-gray-500">עלות</span>
        </div>
      </div>

      {/* Best for */}
      <p className="text-[9px] text-gray-600 mt-2 leading-tight">{model.bestFor}</p>

      {/* Features (only in expanded view) */}
      {!compact && model.features.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {model.features.slice(0, 3).map((f) => (
            <span
              key={f}
              className="text-[8px] bg-white/5 border border-white/10 rounded px-1.5 py-0.5 text-gray-400"
            >
              {f}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function ModelSelector({ selected, onSelect }: Props) {
  const [showAllModels, setShowAllModels] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const recommendedModels = VIDEO_MODELS.filter((m) =>
    RECOMMENDED_MODEL_IDS.includes(m.id)
  );

  const searchResults =
    searchQuery.length > 0
      ? VIDEO_MODELS.filter(
          (m) =>
            m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
            m.bestFor.includes(searchQuery)
        )
      : VIDEO_MODELS;

  return (
    <div>
      {/* === DEFAULT VIEW: 5 recommended models === */}
      {!showAllModels && (
        <>
          <label className="block text-sm text-gray-400 mb-2">מודל וידאו</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {recommendedModels.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={selected === m.id}
                onSelect={() => onSelect(m.id)}
                compact
              />
            ))}
          </div>

          {/* Browse all button */}
          <button
            onClick={() => setShowAllModels(true)}
            className="w-full mt-3 py-2.5 px-4 rounded-lg border border-dashed border-accent-purple/30 bg-accent-purple/5 text-accent-purple-light text-sm hover:bg-accent-purple/10 transition-colors cursor-pointer"
          >
            חפש מודלים נוספים ({VIDEO_MODELS.length - RECOMMENDED_MODEL_IDS.length} מודלים זמינים)
          </button>
        </>
      )}

      {/* === EXPANDED VIEW: Search + All models (modal) === */}
      {showAllModels && (
        <div className="fixed inset-0 z-50 bg-black/85 flex justify-center items-start p-6 sm:p-10 overflow-y-auto">
          <div className="max-w-[900px] w-full">
            {/* Header + Close */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-bold">
                בחר מודל וידאו ({VIDEO_MODELS.length})
              </h2>
              <button
                onClick={() => {
                  setShowAllModels(false);
                  setSearchQuery('');
                }}
                className="text-white text-2xl bg-transparent border-none cursor-pointer hover:text-gray-400 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Search bar */}
            <input
              type="text"
              placeholder="חפש מודל... (Kling, Sora, Runway, סינמטי, מהיר...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              dir="rtl"
              className="w-full py-3 px-4 mb-4 rounded-lg bg-white/10 border border-white/20 text-white text-base outline-none placeholder:text-gray-500 focus:border-accent-purple/50"
            />

            {/* Quick filter chips */}
            <div className="flex gap-2 mb-4 flex-wrap" dir="rtl">
              {FILTER_CHIPS.map((chip) => (
                <button
                  key={chip.query}
                  onClick={() => setSearchQuery(chip.query)}
                  className={`py-1.5 px-3.5 rounded-full text-xs cursor-pointer transition-colors ${
                    searchQuery === chip.query
                      ? 'bg-accent-purple/30 border border-accent-purple text-accent-purple-light'
                      : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Results grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={selected === m.id}
                  onSelect={() => {
                    onSelect(m.id);
                    setShowAllModels(false);
                    setSearchQuery('');
                  }}
                />
              ))}
            </div>

            {searchResults.length === 0 && (
              <p className="text-center text-gray-500 py-10">
                לא נמצאו מודלים עבור &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
