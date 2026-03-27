import { useState, useMemo } from 'react';

interface BrainSuggestion {
  id: string;
  description: string;
  cost: number;
  enabled: boolean;
  category: 'broll' | 'sfx' | 'music' | 'effect' | 'text' | 'zoom' | 'other';
}

interface Props {
  brollPrompts: Array<{ timestamp?: number; prompt: string; duration?: number }>;
  editingBlueprint?: {
    cuts?: Array<{ timestamp: number; type: string; reason: string }>;
    zooms?: Array<{ timestamp: number; zoomLevel?: number; zoomTo?: number; zoomFrom?: number; reason: string }>;
    soundDesign?: { sfx?: Array<{ at: number; type: string; reason: string }> };
    patternInterrupts?: Array<{ at: number; type: string; reason: string }>;
  };
  onSuggestionsChange: (enabledIds: string[]) => void;
}

const categoryIcons: Record<string, string> = {
  broll: '🎬',
  sfx: '🔊',
  music: '🎵',
  effect: '✨',
  text: '📝',
  zoom: '🔍',
  other: '⚙️',
};

const categoryLabels: Record<string, string> = {
  broll: 'B-Roll',
  sfx: 'אפקטי סאונד',
  music: 'מוזיקה',
  effect: 'אפקט',
  text: 'טקסט',
  zoom: 'זום',
  other: 'אחר',
};

// Estimate costs per suggestion type
function estimateCost(category: string): number {
  switch (category) {
    case 'broll': return 0.40;
    case 'sfx': return 0;
    case 'music': return 0.10;
    case 'effect': return 0;
    case 'text': return 0;
    case 'zoom': return 0;
    default: return 0;
  }
}

export default function BrainSuggestionsChecklist({ brollPrompts, editingBlueprint, onSuggestionsChange }: Props) {
  // Build suggestions from available data
  const allSuggestions = useMemo(() => {
    const suggestions: BrainSuggestion[] = [];

    // B-Roll suggestions
    if (brollPrompts) {
      for (let i = 0; i < brollPrompts.length; i++) {
        const bp = brollPrompts[i];
        const timeLabel = bp.timestamp != null ? ` בשנייה ${Math.round(bp.timestamp)}` : '';
        suggestions.push({
          id: `broll-${i}`,
          description: `הוסף B-Roll: "${bp.prompt}"${timeLabel}`,
          cost: 0.40,
          enabled: true,
          category: 'broll',
        });
      }
    }

    // Zoom suggestions from blueprint
    if (editingBlueprint?.zooms) {
      for (let i = 0; i < editingBlueprint.zooms.length; i++) {
        const z = editingBlueprint.zooms[i];
        suggestions.push({
          id: `zoom-${i}`,
          description: `זום x${(z.zoomTo || z.zoomLevel || 1.15).toFixed(2)} בשנייה ${Math.round(z.timestamp)} — ${z.reason}`,
          cost: 0,
          enabled: true,
          category: 'zoom',
        });
      }
    }

    // SFX suggestions from blueprint
    if (editingBlueprint?.soundDesign?.sfx) {
      for (let i = 0; i < editingBlueprint.soundDesign.sfx.length; i++) {
        const sfx = editingBlueprint.soundDesign.sfx[i];
        suggestions.push({
          id: `sfx-${i}`,
          description: `אפקט ${sfx.type} בשנייה ${Math.round(sfx.at)} — ${sfx.reason}`,
          cost: 0,
          enabled: true,
          category: 'sfx',
        });
      }
    }

    // Pattern interrupts
    if (editingBlueprint?.patternInterrupts) {
      for (let i = 0; i < editingBlueprint.patternInterrupts.length; i++) {
        const pi = editingBlueprint.patternInterrupts[i];
        suggestions.push({
          id: `interrupt-${i}`,
          description: `${pi.type} בשנייה ${Math.round(pi.at)} — ${pi.reason}`,
          cost: 0,
          enabled: true,
          category: 'effect',
        });
      }
    }

    return suggestions;
  }, [brollPrompts, editingBlueprint]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    for (const s of allSuggestions) {
      map[s.id] = s.enabled;
    }
    return map;
  });

  const toggleSuggestion = (id: string) => {
    setEnabled(prev => {
      const next = { ...prev, [id]: !prev[id] };
      onSuggestionsChange(Object.keys(next).filter(k => next[k]));
      return next;
    });
  };

  const enabledSuggestions = allSuggestions.filter(s => enabled[s.id]);
  const enabledCost = enabledSuggestions.reduce((sum, s) => sum + s.cost, 0);
  const totalCost = allSuggestions.reduce((sum, s) => sum + s.cost, 0);

  if (allSuggestions.length === 0) return null;

  // Group by category
  const grouped = allSuggestions.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, BrainSuggestion[]>);

  return (
    <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="text-xl">🧠</span>
          המוח ממליץ
        </h3>
        <span className="text-[11px] text-gray-500">
          {enabledSuggestions.length} מתוך {allSuggestions.length} נבחרו
        </span>
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-sm">{categoryIcons[category]}</span>
              <span className="text-[11px] text-gray-400 font-medium">{categoryLabels[category]}</span>
            </div>
            <div className="space-y-1.5">
              {items.map(suggestion => (
                <label
                  key={suggestion.id}
                  className={`flex items-start gap-2.5 text-[11px] rounded-lg px-3 py-2 cursor-pointer transition-colors ${
                    enabled[suggestion.id]
                      ? 'bg-green-500/5 border border-green-500/15 hover:bg-green-500/10'
                      : 'bg-gray-800/30 border border-gray-700/30 hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={enabled[suggestion.id] || false}
                    onChange={() => toggleSuggestion(suggestion.id)}
                    className="mt-0.5 accent-purple-500"
                  />
                  <span className={`flex-1 ${enabled[suggestion.id] ? 'text-white' : 'text-gray-500'}`}>
                    {suggestion.description}
                  </span>
                  {suggestion.cost > 0 ? (
                    <span className="text-amber-400 font-mono text-[10px] flex-shrink-0">
                      ${suggestion.cost.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-green-400 text-[10px] flex-shrink-0">חינם</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cost summary */}
      <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-xs">
        <span className="text-gray-400">
          סה&quot;כ נבחרים: <span className="text-amber-400 font-mono font-bold">${enabledCost.toFixed(2)}</span>
        </span>
        {totalCost > enabledCost && (
          <span className="text-gray-500">
            סה&quot;כ עם כל ההמלצות: <span className="font-mono">${totalCost.toFixed(2)}</span>
          </span>
        )}
      </div>
    </div>
  );
}
