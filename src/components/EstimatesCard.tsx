import { useState } from 'react';
import type { CostItem } from '../types';

interface Props {
  enabledFeaturesCount: number;
  totalFeatures: number;
  estimatedDuration: number;
  estimatedRenderTime: string;
  estimatedCost: string;
  viralityEstimate?: number;
  costItems?: CostItem[];
}

export default function EstimatesCard({
  enabledFeaturesCount,
  totalFeatures,
  estimatedDuration,
  estimatedRenderTime,
  estimatedCost,
  viralityEstimate,
  costItems,
}: Props) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const paidItems = costItems?.filter((i) => !i.free) ?? [];
  const freeItems = costItems?.filter((i) => i.free) ?? [];

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">📋</span>
        אומדנים
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Features count */}
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-accent-purple-light font-mono">
            {enabledFeaturesCount}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            פיצ׳רים מתוך {totalFeatures}
          </div>
          <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500"
              style={{ width: `${(enabledFeaturesCount / totalFeatures) * 100}%` }}
            />
          </div>
        </div>

        {/* Duration */}
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {estimatedDuration}s
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            אורך הסרטון
          </div>
        </div>

        {/* Render time */}
        <div className="bg-dark-card border border-dark-border-light rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-teal-400 font-mono">
            {estimatedRenderTime}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            זמן עיבוד משוער
          </div>
        </div>

        {/* Cost — clickable if breakdown available */}
        <button
          onClick={() => costItems && setShowBreakdown(!showBreakdown)}
          className={`bg-dark-card border border-dark-border-light rounded-xl p-3 text-center ${
            costItems ? 'cursor-pointer hover:border-amber-500/30 transition-colors' : ''
          }`}
        >
          <div className="text-2xl font-bold text-amber-400 font-mono">
            {estimatedCost}
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            עלות משוערת {costItems ? '(לחץ לפירוט)' : ''}
          </div>
        </button>
      </div>

      {/* Itemized cost breakdown */}
      {showBreakdown && costItems && (
        <div className="mt-3 bg-dark-card border border-dark-border-light rounded-xl p-4 space-y-2">
          <h4 className="text-xs text-gray-500 mb-2">פירוט עלויות</h4>

          {/* Paid */}
          {paidItems
            .sort((a, b) => b.cost - a.cost)
            .map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm" dir="rtl">
                <span className="text-gray-300">{item.service}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-gray-600">{item.unit}</span>
                  <span className="font-mono text-amber-400 w-16 text-left">${item.cost.toFixed(3)}</span>
                </div>
              </div>
            ))}

          {/* Free */}
          {freeItems.length > 0 && (
            <div className="border-t border-dark-border-light/50 pt-2 mt-2 space-y-1">
              {freeItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs" dir="rtl">
                  <span className="text-green-500/70">{item.service}</span>
                  <span className="text-green-500/70">{item.unit}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comparison */}
          <div className="border-t border-dark-border-light/50 pt-2 text-center text-xs text-gray-600">
            עלות עורך אנושי: <span className="line-through text-gray-500">₪500+</span>
            <span className="mx-1">|</span>
            עלות AI: <span className="text-amber-400 font-mono font-bold">{estimatedCost}</span>
          </div>
        </div>
      )}

      {/* Virality estimate */}
      {viralityEstimate !== undefined && (
        <div className="mt-3 bg-dark-card border border-dark-border-light rounded-xl p-3 flex items-center gap-3">
          <span className="text-lg">📈</span>
          <div className="flex-1">
            <div className="text-xs text-gray-400 mb-1">ציון ויראליות משוער</div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${viralityEstimate}%`,
                    background: viralityEstimate >= 80
                      ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                      : viralityEstimate >= 60
                      ? 'linear-gradient(90deg, #eab308, #facc15)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
                  }}
                />
              </div>
              <span className={`text-sm font-bold font-mono ${
                viralityEstimate >= 80 ? 'text-green-400' :
                viralityEstimate >= 60 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {viralityEstimate}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
