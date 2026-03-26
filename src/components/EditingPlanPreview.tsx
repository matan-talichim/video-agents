import { useState } from 'react';

interface EditingPlanPreviewProps {
  editingBlueprint: any;
  contentSelection: any;
  marketingPlan: any;
  emotionalArc: any;
  retentionPlan: any;
  paceMode: string;
  subtitleStyle: any;
  beatMap: any;
  brandKit: any;
}

export default function EditingPlanPreview({
  editingBlueprint,
  contentSelection,
  marketingPlan,
  emotionalArc,
  retentionPlan,
  paceMode,
  subtitleStyle,
  beatMap,
  brandKit,
}: EditingPlanPreviewProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between bg-dark-card border border-accent-purple/30 rounded-xl p-4 hover:border-accent-purple/50 transition-colors"
      >
        <h3 className="text-sm font-semibold text-accent-purple-light flex items-center gap-2">
          <span className="text-lg">🎬</span>
          תוכנית עריכה מלאה
        </h3>
        <span className="text-xs text-gray-500">{expanded ? '▲ הסתר' : '▼ הצג הכל'}</span>
      </button>

      {expanded && (
        <div className="space-y-4">
          {/* === SECTION 1: Content Summary === */}
          {contentSelection?.summary && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>📋</span> סיכום תוכן
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <PlanItem
                  label="משך מקורי"
                  value={`${contentSelection.summary.totalFootageDuration?.toFixed(0) || '?'}s`}
                />
                <PlanItem
                  label="משך סופי"
                  value={`${contentSelection.summary.keepDuration?.toFixed(0) || '?'}s`}
                />
                <PlanItem
                  label="נחתך"
                  value={`${contentSelection.summary.cutPercentage || '?'}%`}
                />
                <PlanItem
                  label="קטעי must-keep"
                  value={contentSelection.summary.mustKeepCount || 0}
                />
              </div>
            </div>
          )}

          {/* === SECTION 2: Editing Effects — SHOW ALL === */}
          {editingBlueprint && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>🎬</span> אפקטים מתוכננים
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <EffectCard
                  icon="✂️"
                  name="חיתוכים"
                  count={editingBlueprint.cuts?.length || 0}
                  detail="Murch Rule of Six"
                />
                <EffectCard
                  icon="🔍"
                  name="זומים"
                  count={editingBlueprint.zooms?.length || 0}
                  detail={`עד ${editingBlueprint.zooms?.[0]?.zoomTo || 1.15}x`}
                />
                <EffectCard
                  icon="🎞️"
                  name="B-Roll"
                  count={editingBlueprint.brollInsertions?.length || 0}
                  detail="קליפים AI"
                />
                <EffectCard
                  icon="🏎️"
                  name="Speed Ramps"
                  count={editingBlueprint.speedRamps?.length || 0}
                  detail="האטה/האצה"
                />
                <EffectCard
                  icon="⚡"
                  name="Pattern Interrupts"
                  count={editingBlueprint.patternInterrupts?.length || 0}
                  detail="איפוס תשומת לב"
                />
                <EffectCard
                  icon="🔊"
                  name="אפקטי קול"
                  count={editingBlueprint.soundDesign?.sfx?.length || 0}
                  detail="whoosh, ding, impact"
                />
                <EffectCard
                  icon="🤫"
                  name="שתיקות מוגנות"
                  count={editingBlueprint.protectedSilences?.length || 0}
                  detail="פאוזות שמוכרות"
                />
                <EffectCard
                  icon="🎵"
                  name="Beat Sync"
                  count={beatMap?.beats?.length || 0}
                  detail={`${beatMap?.bpm || '?'} BPM`}
                />
              </div>

              {/* Color plan */}
              {editingBlueprint.colorPlan?.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-yellow-400">🎨</span>
                  <span>תוכנית צבע: {editingBlueprint.colorPlan.map((c: any) => c.temperature).join(' → ')}</span>
                </div>
              )}

              {/* Platform optimization */}
              {editingBlueprint.platformOptimization && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                  <span className="text-pink-400">📱</span>
                  <span>
                    אופטימיזציה: {editingBlueprint.platformOptimization.platform}
                    {editingBlueprint.platformOptimization.hookStrategy?.duration && (
                      <span className="text-gray-500"> (הוק {editingBlueprint.platformOptimization.hookStrategy.duration}s)</span>
                    )}
                  </span>
                </div>
              )}

              {/* Murch score */}
              {editingBlueprint.murchAverageScore > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center gap-2 text-xs">
                  <span className="text-orange-400">★</span>
                  <span className="text-gray-300">
                    ציון Murch ממוצע:{' '}
                    <span className="font-bold text-white">
                      {editingBlueprint.murchAverageScore.toFixed(1)}/10
                    </span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* === SECTION 3: Visual Style === */}
          <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
            <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
              <span>🎨</span> סגנון ויזואלי
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <StyleItem
                label="מצב עריכה"
                value={paceMode === 'fast' ? '⚡ מהיר' : paceMode === 'calm' ? '🧘 רגוע' : '⚖️ מאוזן'}
              />
              {subtitleStyle?.selectedStyle && (
                <StyleItem label="כתוביות" value={subtitleStyle.selectedStyle} />
              )}
              {brandKit?.primaryColor && (
                <StyleItem label="צבע מותג" value={brandKit.primaryColor} color={brandKit.primaryColor} />
              )}
              {subtitleStyle?.config?.fontWeight && (
                <StyleItem
                  label="גופן"
                  value={subtitleStyle.config.fontWeight === 'extra-bold' ? 'Extra Bold' : 'Bold'}
                />
              )}
              {subtitleStyle?.config?.highlightColor && (
                <StyleItem
                  label="צבע הדגשה"
                  value={subtitleStyle.config.highlightColor}
                  color={subtitleStyle.config.highlightColor}
                />
              )}
              {subtitleStyle?.config?.position && (
                <StyleItem
                  label="מיקום כתוביות"
                  value={
                    subtitleStyle.config.position === 'bottom'
                      ? 'תחתון'
                      : subtitleStyle.config.position === 'center'
                        ? 'מרכז'
                        : 'עליון'
                  }
                />
              )}
            </div>
          </div>

          {/* === SECTION 4: Emotional Arc === */}
          {emotionalArc && emotionalArc.length > 0 && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>🎢</span> עקומת אנרגיה
              </h4>
              <div className="flex items-end gap-0.5 h-16">
                {emotionalArc.map((phase: any, i: number) => {
                  const totalDur = emotionalArc.reduce(
                    (sum: number, a: any) => sum + (a.end - a.start),
                    0
                  );
                  const width = ((phase.end - phase.start) / totalDur) * 100;
                  const height = (phase.energy / 10) * 100;
                  const bgColor =
                    phase.energy >= 8
                      ? 'bg-red-500'
                      : phase.energy >= 5
                        ? 'bg-amber-500'
                        : 'bg-green-500';
                  return (
                    <div
                      key={i}
                      className="flex flex-col items-center justify-end"
                      style={{ width: `${width}%` }}
                      title={`${phase.phase} | אנרגיה: ${phase.energy}/10`}
                    >
                      <span className="text-[8px] text-white font-bold mb-0.5">
                        {phase.energy}
                      </span>
                      <div
                        className={`${bgColor} rounded-t w-full opacity-70`}
                        style={{ height: `${height}%` }}
                      />
                      <span className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-tight">
                        {phase.phase}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* === SECTION 5: Marketing === */}
          {marketingPlan && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>📢</span> שיווק
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {marketingPlan.framework?.selectedFramework && (
                  <PlanItem label="מסגרת" value={marketingPlan.framework.selectedFramework} />
                )}
                {marketingPlan.ctaPlan?.primaryCTA?.text && (
                  <PlanItem label="CTA" value={marketingPlan.ctaPlan.primaryCTA.text} />
                )}
                {editingBlueprint?.hookVariations?.[0]?.type && (
                  <PlanItem label="סוג הוק" value={editingBlueprint.hookVariations[0].type} />
                )}
              </div>
            </div>
          )}

          {/* === SECTION 6: Quality Scores === */}
          {(retentionPlan?.predictedRetention || editingBlueprint?.murchAverageScore) && (
            <div className="bg-dark-card border border-dark-border-light rounded-xl p-4">
              <h4 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>📊</span> ציונים
              </h4>
              <div className="space-y-3">
                {retentionPlan?.predictedRetention && (
                  <ScoreBar
                    label="שימור צופים"
                    value={retentionPlan.predictedRetention}
                    max={100}
                  />
                )}
                {editingBlueprint?.murchAverageScore && (
                  <ScoreBar
                    label="איכות עריכה"
                    value={Math.round(editingBlueprint.murchAverageScore * 10)}
                    max={100}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Sub-components ---

function EffectCard({
  icon,
  name,
  count,
  detail,
}: {
  icon: string;
  name: string;
  count: number;
  detail: string;
}) {
  return (
    <div className="bg-gray-800/50 border border-dark-border-light/50 rounded-lg p-3 text-center">
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-[11px] font-medium text-gray-300">{name}</div>
      <div className="text-lg font-bold text-accent-purple-light font-mono">{count}</div>
      <div className="text-[10px] text-gray-500">{detail}</div>
    </div>
  );
}

function PlanItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-xs">
      <span className="text-gray-500">{label}: </span>
      <strong className="text-gray-200">{value}</strong>
    </div>
  );
}

function StyleItem({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {color && (
        <div
          className="w-3 h-3 rounded flex-shrink-0 border border-white/20"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-gray-500">{label}: </span>
      <strong className="text-gray-200">{value}</strong>
    </div>
  );
}

function ScoreBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 70 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="font-mono text-gray-300">{value}%</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}
