import { useState, useEffect, useRef } from 'react';
import type { CostItem } from '../types';

interface Props {
  items: CostItem[];
  total: number;
}

export default function LiveCostBreakdown({ items, total }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [pulse, setPulse] = useState(false);
  const prevTotal = useRef(total);

  // Animate total on change
  useEffect(() => {
    if (prevTotal.current !== total) {
      setPulse(true);
      const timer = setTimeout(() => setPulse(false), 400);
      prevTotal.current = total;
      return () => clearTimeout(timer);
    }
  }, [total]);

  const paidItems = items.filter((i) => !i.free);
  const freeItems = items.filter((i) => i.free);
  const isFree = total === 0 && paidItems.length === 0;

  return (
    <div
      dir="rtl"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-dark-border-light/50 bg-[#111827]/95 backdrop-blur-lg"
    >
      <div className="max-w-5xl mx-auto px-4">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between py-3"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {expanded ? '▼' : '▲'}
            </span>
            <span className="text-sm text-gray-400">עלות משוערת</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Total */}
            <span
              className={`font-mono font-bold text-lg transition-transform duration-300 ${
                pulse ? 'scale-125' : 'scale-100'
              } ${isFree ? 'text-green-400' : 'text-accent-purple-light'}`}
            >
              {isFree ? 'חינם!' : `$${total.toFixed(2)}`}
            </span>

            {/* Quick stats */}
            <span className="text-[10px] text-gray-600 hidden sm:inline">
              {paidItems.length} בתשלום | {freeItems.length} חינם
            </span>
          </div>
        </button>

        {/* Expanded breakdown */}
        {expanded && (
          <div className="pb-4 space-y-3 border-t border-dark-border-light/30 pt-3">
            {/* Paid services */}
            {paidItems.length > 0 && (
              <div className="space-y-1.5">
                {paidItems
                  .sort((a, b) => b.cost - a.cost)
                  .map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{item.service}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-600">{item.unit}</span>
                        <span className="font-mono text-amber-400 w-16 text-left">
                          ${item.cost.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}

            {/* Free services */}
            {freeItems.length > 0 && (
              <div className="space-y-1">
                {freeItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-green-500/70">{item.service}</span>
                    <span className="text-green-500/70 text-xs">
                      {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Separator + Total */}
            <div className="border-t border-dark-border-light/30 pt-2 flex items-center justify-between">
              <span className="text-sm text-gray-400 font-medium">סה״כ</span>
              <span
                className={`font-mono font-bold text-xl transition-transform duration-300 ${
                  pulse ? 'scale-110' : 'scale-100'
                } ${isFree ? 'text-green-400' : 'text-accent-purple-light'}`}
              >
                {isFree ? 'חינם!' : `$${total.toFixed(2)}`}
              </span>
            </div>

            {/* Human editor comparison */}
            <div className="text-center text-xs text-gray-600">
              עלות עורך אנושי: <span className="line-through text-gray-500">₪500+</span>
              <span className="mx-1">|</span>
              עלות AI: <span className="text-amber-400 font-mono font-bold">${total.toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
