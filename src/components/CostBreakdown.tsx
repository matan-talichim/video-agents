import { getModelById, VIDEO_MODELS } from '../data/videoModels';

interface Props {
  blueprint: any;
  selectedModel?: string;
  hasMusic?: boolean;
  hasFiles?: boolean;
}

export default function CostBreakdown({ blueprint, selectedModel, hasMusic, hasFiles }: Props) {
  const brollCount = blueprint?.brollInsertions?.length || 0;
  const model = getModelById(selectedModel || 'veo-3.1-fast') || VIDEO_MODELS[0];
  const pricePerClip = model.pricePerClip;
  const brollCost = brollCount * pricePerClip;
  const claudeCost = 0.06;
  const musicCost = hasMusic !== false ? 0.10 : 0;
  const deepgramCost = hasFiles !== false ? 0.01 : 0;
  const total = brollCost + claudeCost + musicCost + deepgramCost;

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-xl p-4" dir="rtl">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">💰</span>
        עלות
      </h3>

      <div className="space-y-2 text-sm">
        {brollCount > 0 && (
          <CostRow
            label={`B-Roll (${brollCount}× ${model.name})`}
            cost={brollCost}
          />
        )}
        <CostRow
          label="ניתוח ועריכה AI"
          cost={claudeCost}
        />
        {musicCost > 0 && (
          <CostRow
            label="מוזיקה"
            cost={musicCost}
          />
        )}
        {deepgramCost > 0 && (
          <CostRow
            label="תמלול"
            cost={deepgramCost}
          />
        )}
        <div className="flex items-center justify-between text-gray-500 text-xs">
          <span>עיבוד וידאו (חינם)</span>
          <span className="text-green-500/70 font-mono">$0.00</span>
        </div>

        {/* Separator + Total */}
        <div className="border-t border-dark-border-light/50 pt-2 mt-2 flex items-center justify-between font-bold text-base">
          <span className="text-gray-300">סה&quot;כ</span>
          <span className="text-accent-purple-light font-mono">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, cost }: { label: string; cost: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <span className="font-mono text-amber-400">${cost.toFixed(2)}</span>
    </div>
  );
}
