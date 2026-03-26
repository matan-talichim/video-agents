import { useState } from 'react';

interface FrameworkMapping {
  stage: string;
  start: number;
  end: number;
  content: string;
}

interface TextOverlay {
  type: string;
  text: string;
  timestamp: number;
  duration: number;
  fontSize: string;
  animation: string;
  position: string;
  color: string;
  originalPrice?: string;
  salePrice?: string;
}

interface SfxItem {
  type: string;
  usage: string;
}

interface MarketingPlan {
  framework: {
    selectedFramework: string;
    frameworkReason: string;
    frameworkMapping: FrameworkMapping[];
  };
  copywriting: {
    textOverlays: TextOverlay[];
  };
  colorStrategy: {
    primaryCTAColor: string;
    primaryCTAReason: string;
    textHighlightColor: string;
    priceColor: string;
    urgencyColor: string;
    backgroundOverlay: string;
  };
  soundStrategy: {
    musicKey: string;
    bpmRange: string;
    genre: string;
    reason: string;
    sfxPlan: SfxItem[];
  };
}

interface ThumbnailPlan {
  bestFrameTimestamp: number;
  textOverlay: string;
  textPosition: string;
  faceVisible: boolean;
  faceExpression: string;
  viralScore: number;
  reason: string;
}

interface PlatformCut {
  platform: string;
  maxDuration: number;
  pacing: string;
  segmentsToInclude: number[];
  segmentsToExclude: number[];
}

interface MarketingPlanPanelProps {
  marketingPlan?: MarketingPlan;
  thumbnailPlan?: ThumbnailPlan;
  platformCuts?: PlatformCut[];
}

const frameworkColors: Record<string, string> = {
  'AIDA': 'text-purple-400',
  'PAS': 'text-amber-400',
  'BAB': 'text-green-400',
  'HOOK-VALUE-CTA': 'text-pink-400',
  'STAR-STORY-SOLUTION': 'text-blue-400',
};

const stageColors: Record<string, string> = {
  attention: 'bg-red-500/20 text-red-300 border-red-500/30',
  interest: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  desire: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  action: 'bg-green-500/20 text-green-300 border-green-500/30',
  problem: 'bg-red-500/20 text-red-300 border-red-500/30',
  agitate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  solution: 'bg-green-500/20 text-green-300 border-green-500/30',
  before: 'bg-red-500/20 text-red-300 border-red-500/30',
  after: 'bg-green-500/20 text-green-300 border-green-500/30',
  bridge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  hook: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  value: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  star: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  story: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
};

const overlayTypeLabels: Record<string, string> = {
  headline: 'כותרת',
  'sub-headline': 'כותרת משנה',
  'bullet-points': 'נקודות',
  price: 'מחיר',
  statistic: 'סטטיסטיקה',
  urgency: 'דחיפות',
  'doubt-remover': 'מסיר חששות',
  label: 'תווית',
  'quote-card': 'ציטוט',
  'social-proof-counter': 'הוכחה חברתית',
};

const platformLabels: Record<string, string> = {
  youtube: 'YouTube',
  'instagram-reels': 'Reels',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  facebook: 'Facebook',
};

const pacingLabels: Record<string, string> = {
  fast: 'מהיר',
  medium: 'בינוני',
  slow: 'איטי',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span
        className="w-4 h-4 rounded border border-white/10 flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-600 font-mono text-[10px]">{color}</span>
    </div>
  );
}

export default function MarketingPlanPanel({
  marketingPlan,
  thumbnailPlan,
  platformCuts,
}: MarketingPlanPanelProps) {
  const [expanded, setExpanded] = useState(true);

  const hasData = marketingPlan || thumbnailPlan || (platformCuts && platformCuts.length > 0);
  if (!hasData) return null;

  const fw = marketingPlan?.framework;
  const cp = marketingPlan?.copywriting;
  const cs = marketingPlan?.colorStrategy;
  const ss = marketingPlan?.soundStrategy;

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
            {'תוכנית שיווק'}
            <span className="mr-auto text-[10px] text-gray-600">
              {expanded ? '▲' : '▼'}
            </span>
          </h3>
          <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
            {fw && (
              <span className={`px-2 py-1 rounded-full bg-purple-500/20 ${frameworkColors[fw.selectedFramework] || 'text-purple-300'}`}>
                {'🎯'} {fw.selectedFramework}
              </span>
            )}
            {cp && (
              <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                {'📝'} {cp.textOverlays.length} טקסטים
              </span>
            )}
            {thumbnailPlan && (
              <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                {'🖼️'} {thumbnailPlan.viralScore}/10
              </span>
            )}
            {platformCuts && platformCuts.length > 0 && (
              <span className="px-2 py-1 rounded-full bg-gray-800 text-gray-300">
                {'📱'} {platformCuts.length} פלטפורמות
              </span>
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <>
          {/* Framework */}
          {fw && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">
                {'🎯'} מסגרת: {fw.selectedFramework}
              </h3>
              <p className="text-[11px] text-gray-400 mb-3">
                {fw.frameworkReason}
              </p>

              {/* Framework stages timeline */}
              <div className="flex gap-1 w-full">
                {fw.frameworkMapping.map((stage, i) => {
                  const totalDuration = fw.frameworkMapping.reduce((sum, s) => sum + (s.end - s.start), 0);
                  const width = totalDuration > 0 ? ((stage.end - stage.start) / totalDuration) * 100 : 100 / fw.frameworkMapping.length;
                  const colorClass = stageColors[stage.stage.toLowerCase()] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';

                  return (
                    <div
                      key={i}
                      className={`rounded-lg border p-2 text-center ${colorClass}`}
                      style={{ width: `${width}%` }}
                    >
                      <div className="text-[10px] font-bold uppercase truncate">
                        {stage.stage}
                      </div>
                      <div className="text-[9px] opacity-70">
                        {stage.start}-{stage.end}s
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Copywriting Text Overlays */}
          {cp && cp.textOverlays.length > 0 && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">
                {'📝'} טקסטים שיווקיים ({cp.textOverlays.length})
              </h3>
              <div className="space-y-1.5">
                {cp.textOverlays.map((overlay, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="text-gray-600 font-mono w-10 flex-shrink-0">
                      {formatTime(overlay.timestamp)}
                    </span>
                    <span className="text-white flex-1 truncate">
                      {overlay.type === 'price' && overlay.originalPrice
                        ? `${overlay.originalPrice} → ${overlay.salePrice}`
                        : `"${overlay.text}"`
                      }
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500 flex-shrink-0">
                      {overlayTypeLabels[overlay.type] || overlay.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Color Strategy */}
          {cs && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'🎨'} צבעים</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ColorSwatch color={cs.primaryCTAColor} label="CTA" />
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    ← {cs.primaryCTAReason}
                  </span>
                </div>
                <ColorSwatch color={cs.priceColor} label="מחיר" />
                <ColorSwatch color={cs.textHighlightColor} label="הדגשות" />
                <ColorSwatch color={cs.urgencyColor} label="דחיפות" />
              </div>
            </div>
          )}

          {/* Sound Strategy */}
          {ss && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'🎵'} סאונד</h3>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">ז׳אנר:</span>
                  <span className="text-white">{ss.genre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">קצב:</span>
                  <span className="text-white">{ss.bpmRange} BPM</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">סולם:</span>
                  <span className="text-white">{ss.musicKey}</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-1">← {ss.reason}</p>

                {ss.sfxPlan && ss.sfxPlan.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ss.sfxPlan.map((sfx, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300" title={sfx.usage}>
                        {sfx.type}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Thumbnail Plan */}
          {thumbnailPlan && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'🖼️'} Thumbnail</h3>
              <div className="space-y-1 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">פריים:</span>
                  <span className="text-white">{formatTime(thumbnailPlan.bestFrameTimestamp)}</span>
                  <span className="text-[10px] text-gray-500">— {thumbnailPlan.reason}</span>
                </div>
                {thumbnailPlan.textOverlay && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-14 flex-shrink-0">טקסט:</span>
                    <span className="text-white">&quot;{thumbnailPlan.textOverlay}&quot;</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">פנים:</span>
                  <span className="text-white">
                    {thumbnailPlan.faceVisible ? `כן — ${thumbnailPlan.faceExpression}` : 'לא'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 w-14 flex-shrink-0">ציון:</span>
                  <span className={`font-bold ${thumbnailPlan.viralScore >= 7 ? 'text-green-400' : thumbnailPlan.viralScore >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                    {thumbnailPlan.viralScore}/10
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Platform Cuts */}
          {platformCuts && platformCuts.length > 0 && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h3 className="text-xs text-gray-500 mb-3">{'📱'} גרסאות פלטפורמה</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="text-gray-500 border-b border-dark-border">
                      <th className="text-right py-1 pr-2">פלטפורמה</th>
                      <th className="text-right py-1">זמן</th>
                      <th className="text-right py-1">קטעים</th>
                      <th className="text-right py-1">קצב</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformCuts.map((cut, i) => (
                      <tr key={i} className="border-b border-dark-border/50">
                        <td className="py-1.5 pr-2 text-white font-medium">
                          {platformLabels[cut.platform] || cut.platform}
                        </td>
                        <td className="py-1.5 text-gray-300">{cut.maxDuration}s</td>
                        <td className="py-1.5 text-gray-300">
                          {cut.segmentsToInclude.length > 0
                            ? `${cut.segmentsToInclude.length}`
                            : '—'}
                        </td>
                        <td className="py-1.5 text-gray-300">
                          {pacingLabels[cut.pacing] || cut.pacing}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
