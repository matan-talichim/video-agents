import { useState } from 'react';

interface MarketingStrategy {
  videoAdType: string;
  videoAdTypeHebrew: string;
  suggestedStructure: string[];
  ctaPlan: {
    primaryCTA: { text: string; subtext: string; timestamp: string; style: string; position: string };
    midrollCTA?: { text: string; timestamp: string; style: string; subtle: boolean };
    ctaVariation?: { text: string; urgency: boolean };
  };
  textOverlaysByType: Array<{ timestamp: number; text: string; type: string }>;
}

interface ConversionStrategy {
  funnelStage: 'top' | 'middle' | 'bottom';
  psychologicalTriggers: string[];
  triggerImplementation: Array<{
    trigger: string;
    text: string;
    timestamp: string | number;
    visual: string;
  }>;
}

interface IndustryStrategy {
  industry: string;
  industryRules: {
    leadWith: string;
    mustInclude: string[];
    colorGrading: string;
    musicMood: string;
    ctaStyle: string;
  };
}

interface SocialProofItem {
  type: 'numbers' | 'testimonial' | 'logos' | 'results';
  text: string;
  timestamp: number;
  visual: string;
}

interface MarketingStrategyPanelProps {
  marketingStrategy?: MarketingStrategy;
  conversionStrategy?: ConversionStrategy;
  industryStrategy?: IndustryStrategy;
  socialProofPlan?: SocialProofItem[];
}

const funnelLabels: Record<string, { text: string; color: string }> = {
  top: { text: 'מודעות (Top)', color: 'text-blue-400' },
  middle: { text: 'שיקול (Middle)', color: 'text-amber-400' },
  bottom: { text: 'החלטה (Bottom)', color: 'text-green-400' },
};

const triggerLabels: Record<string, string> = {
  scarcity: 'מחסור',
  'social-proof': 'הוכחה חברתית',
  authority: 'סמכות',
  reciprocity: 'הדדיות',
  'loss-aversion': 'פחד מהפסד',
  anchoring: 'עיגון',
  bandwagon: 'עדר',
};

const proofTypeLabels: Record<string, string> = {
  numbers: 'מספרים',
  testimonial: 'עדות',
  logos: 'לוגואים',
  results: 'תוצאות',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function MarketingStrategyPanel({
  marketingStrategy,
  conversionStrategy,
  industryStrategy,
  socialProofPlan,
}: MarketingStrategyPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const hasData = marketingStrategy || conversionStrategy || industryStrategy || (socialProofPlan && socialProofPlan.length > 0);
  if (!hasData) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <button
        className="w-full text-right"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="bg-dark-card border border-accent-purple/30 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-accent-purple-light flex items-center gap-2">
            <span className="text-lg">{'📊'}</span>
            {'אסטרטגיית שיווק'}
            <span className="mr-auto text-[10px] text-gray-600">
              {expanded ? '▲' : '▼'}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
            {marketingStrategy && (
              <span className="px-2 py-1 rounded-full bg-purple-500/20 text-purple-300">
                {'🎬'} {marketingStrategy.videoAdTypeHebrew}
              </span>
            )}
            {conversionStrategy && (
              <span className={`px-2 py-1 rounded-full bg-gray-800 ${funnelLabels[conversionStrategy.funnelStage]?.color || 'text-gray-300'}`}>
                {'🎯'} {funnelLabels[conversionStrategy.funnelStage]?.text || conversionStrategy.funnelStage}
              </span>
            )}
            {industryStrategy && (
              <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                {'🏢'} {industryStrategy.industry}
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <>
          {/* Funnel & Triggers */}
          {conversionStrategy && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'🧠'} טריגרים פסיכולוגיים</h3>

              <div className="space-y-2">
                {conversionStrategy.psychologicalTriggers.map((trigger, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                    <span className="text-white font-medium">
                      {triggerLabels[trigger] || trigger}
                    </span>
                    {conversionStrategy.triggerImplementation
                      .filter(t => t.trigger === trigger)
                      .map((impl, j) => (
                        <span key={j} className="text-gray-500 truncate">
                          — &quot;{impl.text}&quot;
                        </span>
                      ))
                    }
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Plan */}
          {marketingStrategy?.ctaPlan && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'📣'} תוכנית CTA</h3>

              <div className="space-y-2">
                {/* Midroll CTA */}
                {marketingStrategy.ctaPlan.midrollCTA && (
                  <div className="rounded-lg p-3 border border-blue-500/20 bg-blue-500/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] text-blue-400 mb-0.5">
                          באמצע ({marketingStrategy.ctaPlan.midrollCTA.timestamp})
                        </p>
                        <p className="text-xs text-white font-medium">
                          &quot;{marketingStrategy.ctaPlan.midrollCTA.text}&quot;
                        </p>
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-400">
                        רך
                      </span>
                    </div>
                  </div>
                )}

                {/* Primary CTA */}
                <div className="rounded-lg p-3 border border-green-500/30 bg-green-500/5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] text-green-400 mb-0.5">
                        בסוף ({marketingStrategy.ctaPlan.primaryCTA.timestamp})
                      </p>
                      <p className="text-sm text-white font-bold">
                        &quot;{marketingStrategy.ctaPlan.primaryCTA.text}&quot;
                      </p>
                      {marketingStrategy.ctaPlan.primaryCTA.subtext && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {marketingStrategy.ctaPlan.primaryCTA.subtext}
                        </p>
                      )}
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">
                      חזק
                    </span>
                  </div>
                </div>

                {/* CTA Variation (A/B) */}
                {marketingStrategy.ctaPlan.ctaVariation && (
                  <div className="rounded-lg p-3 border border-amber-500/20 bg-amber-500/5">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] text-amber-400 mb-0.5">גרסה B</p>
                        <p className="text-xs text-white font-medium">
                          &quot;{marketingStrategy.ctaPlan.ctaVariation.text}&quot;
                        </p>
                      </div>
                      {marketingStrategy.ctaPlan.ctaVariation.urgency && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400">
                          דחיפות
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Marketing Text Overlays */}
          {marketingStrategy?.textOverlaysByType && marketingStrategy.textOverlaysByType.length > 0 && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'📝'} טקסטים שיווקיים</h3>
              <div className="space-y-1.5">
                {marketingStrategy.textOverlaysByType.map((overlay, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600 font-mono w-10 flex-shrink-0">
                      {formatTime(overlay.timestamp)}
                    </span>
                    <span className="text-white flex-1 truncate">&quot;{overlay.text}&quot;</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 flex-shrink-0">
                      {overlay.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Social Proof */}
          {socialProofPlan && socialProofPlan.length > 0 && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'⭐'} הוכחה חברתית</h3>
              <div className="space-y-2">
                {socialProofPlan.map((proof, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600 font-mono w-10 flex-shrink-0">
                      {formatTime(proof.timestamp)}
                    </span>
                    <span className="text-white flex-1">&quot;{proof.text}&quot;</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 flex-shrink-0">
                      {proofTypeLabels[proof.type] || proof.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Industry Rules */}
          {industryStrategy && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'🏢'} כללי תעשייה: {industryStrategy.industry}</h3>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">פתיחה עם:</span>
                  <span className="text-white">{industryStrategy.industryRules.leadWith}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">צבעוניות:</span>
                  <span className="text-white">{industryStrategy.industryRules.colorGrading}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-20 flex-shrink-0">מוזיקה:</span>
                  <span className="text-white">{industryStrategy.industryRules.musicMood}</span>
                </div>
                {industryStrategy.industryRules.mustInclude.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {industryStrategy.industryRules.mustInclude.map((item, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300">
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
