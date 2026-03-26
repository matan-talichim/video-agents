interface Props {
  job: any;
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div className="p-3 rounded-xl bg-white/5 text-center">
      <div className="text-xl">{icon}</div>
      <div className="text-xl font-bold text-purple-400">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

export default function EditingSummary({ job }: Props) {
  const bp = (job as any).editingBlueprint;
  if (!bp) return null;

  const emotionalArc = (job as any).emotionalArc || bp.emotionalArc;

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      <h3 className="text-base font-semibold text-white">סיכום עריכה</h3>
      <div className="grid grid-cols-4 gap-3">
        <StatCard icon="✂️" label="חיתוכים" value={bp.cuts?.length || 0} />
        <StatCard icon="🔍" label="זומים" value={bp.zooms?.length || 0} />
        <StatCard icon="🎞️" label="B-Roll" value={bp.brollInsertions?.length || 0} />
        <StatCard icon="🏎️" label="Speed Ramps" value={bp.speedRamps?.length || 0} />
        <StatCard icon="⚡" label="Interrupts" value={bp.patternInterrupts?.length || 0} />
        <StatCard icon="🔊" label="SFX" value={bp.soundDesign?.sfx?.length || 0} />
        <StatCard icon="🤫" label="שתיקות מוגנות" value={bp.protectedSilences?.length || 0} />
        <StatCard icon="🎵" label="BPM" value={(job as any).beatMap?.bpm || '—'} />
      </div>

      {/* Emotional Arc Visual */}
      {emotionalArc && emotionalArc.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">עקומת אנרגיה</h4>
          <div className="flex items-end gap-0.5" style={{ height: '80px' }}>
            {emotionalArc.map((phase: any, i: number) => {
              const energy = phase.energy || 5;
              const bgColor = energy >= 8 ? 'bg-red-500' : energy >= 5 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div
                  key={i}
                  className={`flex-1 ${bgColor} rounded-t relative`}
                  style={{ height: `${energy * 8}px` }}
                >
                  <span className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 text-[10px] text-gray-500 whitespace-nowrap">
                    {phase.phase}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
