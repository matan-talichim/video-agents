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
  beatMap,
}: EditingPlanPreviewProps) {
  if (!editingBlueprint) return null;

  return (
    <div dir="rtl">
      <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
        <span className="text-lg">🧠</span>
        תוכנית עריכה
      </h3>

      <div className="flex flex-wrap gap-2">
        <MiniStat
          icon="✂️"
          value={editingBlueprint.cuts?.length || 0}
          label="חיתוכים"
        />
        <MiniStat
          icon="🔍"
          value={editingBlueprint.zooms?.length || 0}
          label="זומים"
        />
        <MiniStat
          icon="🏎️"
          value={editingBlueprint.speedRamps?.length || 0}
          label="שינויי מהירות"
        />
        <MiniStat
          icon="⚡"
          value={editingBlueprint.patternInterrupts?.length || 0}
          label="אפקטי תשומת לב"
        />
        <MiniStat
          icon="🔊"
          value={editingBlueprint.soundDesign?.sfx?.length || 0}
          label="אפקטי קול"
        />
        {beatMap?.bpm && (
          <MiniStat
            icon="🎵"
            value={beatMap.bpm}
            label="BPM"
          />
        )}
      </div>

      {/* Murch score — compact */}
      {editingBlueprint.murchAverageScore > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          <span className="text-orange-400">★</span>
          <span className="text-gray-400">
            ציון Murch ממוצע:{' '}
            <span className="font-bold text-white">
              {editingBlueprint.murchAverageScore.toFixed(1)}/10
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function MiniStat({ icon, value, label }: { icon: string; value: number; label: string }) {
  if (value === 0) return null;
  return (
    <div className="bg-dark-card border border-dark-border-light rounded-lg px-3 py-2 flex items-center gap-2">
      <span>{icon}</span>
      <span className="font-bold text-accent-purple-light font-mono">{value}</span>
      <span className="text-[11px] text-gray-500">{label}</span>
    </div>
  );
}
