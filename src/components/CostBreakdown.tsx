interface Props {
  blueprint: any;
}

export default function CostBreakdown({ blueprint }: Props) {
  const brollCount = blueprint?.brollInsertions?.length || 2;

  const costs = {
    // Core Pipeline
    transcription: 0.01,
    contentSelection: 0.06,
    contentAnalysis: 0.03,
    editingBlueprint: 0.03,

    // Brain Intelligence
    emotionalArc: 0.03,
    patternInterrupts: 0.03,

    // B-Roll
    brollPrompts: 0.03,
    brollGeneration: brollCount * 0.15,
    brollQA: 0.02,

    // Music
    musicGeneration: 0.10,

    // Marketing
    marketingPlan: 0.03,
    hookGeneration: 0.03,

    // Quality
    retentionAnalysis: 0.03,
    freshEyesReview: 0.03,
    qaCheck: 0.02,

    // Enterprise Polish
    subtitleStyle: 0.03,
    brandCompliance: 0.02,
    expressionAnalysis: 0.03,
    engagementPrediction: 0.03,
    contentSafety: 0.03,
    devicePreview: 0.02,

    // Export
    loopOptimizer: 0.03,
    thumbnails: 0.02,

    // Ambient
    ambientSound: 0.03,
  };

  const total = Object.values(costs).reduce((sum, c) => sum + c, 0);

  const claudeCallCount = Math.round(
    (costs.contentSelection +
      costs.contentAnalysis +
      costs.editingBlueprint +
      costs.emotionalArc +
      costs.patternInterrupts +
      costs.marketingPlan +
      costs.retentionAnalysis +
      costs.freshEyesReview +
      costs.hookGeneration +
      costs.loopOptimizer +
      costs.subtitleStyle +
      costs.engagementPrediction +
      costs.contentSafety +
      costs.ambientSound) /
      0.03
  );

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-xl p-4" dir="rtl">
      <h3 className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <span>💰</span> עלות משוערת (פירוט מלא)
      </h3>

      <div className="space-y-1.5 text-xs">
        <CostRow
          label="תמלול (Deepgram)"
          cost={costs.transcription}
        />
        <CostRow
          label={`ניתוח תוכן (4 Claude calls)`}
          cost={costs.contentSelection + costs.contentAnalysis + costs.editingBlueprint + costs.emotionalArc}
        />
        <CostRow
          label={`מוח עריכה (4 Claude calls)`}
          cost={costs.patternInterrupts + costs.ambientSound + costs.marketingPlan + costs.hookGeneration}
        />
        <CostRow
          label={`B-Roll (${brollCount} קליפים)`}
          cost={costs.brollPrompts + costs.brollGeneration + costs.brollQA}
        />
        <CostRow
          label="מוזיקה (Suno)"
          cost={costs.musicGeneration}
        />
        <CostRow
          label={`QA + בדיקות (5 calls)`}
          cost={costs.retentionAnalysis + costs.freshEyesReview + costs.qaCheck + costs.loopOptimizer + costs.thumbnails}
        />
        <CostRow
          label={`Enterprise Polish (6 calls)`}
          cost={costs.subtitleStyle + costs.brandCompliance + costs.expressionAnalysis + costs.engagementPrediction + costs.contentSafety + costs.devicePreview}
        />
        <CostRow
          label="Thumbnails"
          cost={costs.thumbnails}
        />

        {/* Free row */}
        <div className="flex items-center justify-between text-gray-500">
          <span>FFmpeg (חינם): stabilize, upscale, loudness, blur, intro/outro, reframe, beat-sync</span>
          <span className="text-green-500/70 font-mono">$0.00</span>
        </div>

        {/* Separator + Total */}
        <div className="border-t border-dark-border-light/50 pt-2 mt-2 flex items-center justify-between font-bold text-sm">
          <span className="text-gray-300">סה&quot;כ משוער</span>
          <span className="text-accent-purple-light font-mono">${total.toFixed(2)}</span>
        </div>

        {/* Summary line */}
        <div className="text-[10px] text-gray-600 text-center mt-1">
          ~{claudeCallCount} Claude calls + {brollCount} B-Roll clips + 1 music track
        </div>
      </div>
    </div>
  );
}

function CostRow({ label, cost }: { label: string; cost: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300">{label}</span>
      <span className="font-mono text-amber-400 w-16 text-left">${cost.toFixed(2)}</span>
    </div>
  );
}
