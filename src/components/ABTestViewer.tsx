import { useState, useEffect, useCallback } from 'react';

interface ABVariation {
  id: string;
  hookType: string;
  textOverlay: string;
  viralScore: number;
  status: 'ready' | 'generating';
  videoUrl: string | null;
}

interface ABStatusResponse {
  variations: ABVariation[];
  status: 'generating' | 'ready' | 'none';
}

interface ABTestViewerProps {
  jobId: string;
}

const HOOK_TYPE_LABELS: Record<string, string> = {
  'curiosity-gap': 'פער סקרנות',
  'statistic': 'סטטיסטיקה',
  'bold-claim': 'טענה נועזת',
  'question': 'שאלה',
  'pattern-interrupt': 'שבירת דפוס',
  'social-proof': 'הוכחה חברתית',
  'challenge': 'אתגר',
};

export default function ABTestViewer({ jobId }: ABTestViewerProps) {
  const [variations, setVariations] = useState<ABVariation[]>([]);
  const [status, setStatus] = useState<string>('none');
  const [selectedVariation, setSelectedVariation] = useState<string | null>(null);
  const [winner, setWinner] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${jobId}/ab-status`);
      const data: ABStatusResponse = await res.json();
      setVariations(data.variations);
      setStatus(data.status);
      if (data.variations.length > 0 && !selectedVariation) {
        setSelectedVariation(data.variations[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch A/B status:', err);
    }
  }, [jobId, selectedVariation]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll for remaining variations while generating
  useEffect(() => {
    if (status !== 'generating') return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [status, fetchStatus]);

  if (variations.length === 0) return null;

  const selected = variations.find(v => v.id === selectedVariation);

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          A/B Testing — {variations.length} גרסאות הוקים
        </h3>
        <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-lg">
          $0 נוסף (אותו B-Roll!)
        </span>
      </div>

      {/* Variation Thumbnails */}
      <div className="flex gap-3">
        {variations.map((v, i) => {
          const letter = String.fromCharCode(65 + i);
          const isSelected = v.id === selectedVariation;
          const isReady = v.status === 'ready';

          return (
            <button
              key={v.id}
              onClick={() => isReady && setSelectedVariation(v.id)}
              disabled={!isReady}
              className={`flex-1 rounded-xl border-2 p-3 transition-all text-center ${
                isSelected
                  ? 'border-purple-500 bg-purple-500/10'
                  : isReady
                    ? 'border-dark-border-light hover:border-gray-500 bg-dark-bg'
                    : 'border-dark-border-light/50 bg-dark-bg/50 opacity-60'
              }`}
            >
              <div className="text-lg font-bold mb-1">
                {isReady ? `${letter}` : '...'}
              </div>
              <div className="text-xs text-yellow-400">
                {isReady ? `${v.viralScore}/10` : 'מייצר...'}
              </div>
              {winner === v.id && (
                <div className="text-xs text-green-400 mt-1">מנצח</div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Variation Details */}
      {selected && (
        <div className="space-y-3">
          {/* Video Player for selected variation */}
          {selected.videoUrl && (
            <video
              key={selected.videoUrl}
              src={selected.videoUrl}
              controls
              className="w-full rounded-xl bg-black"
              style={{ maxHeight: '300px' }}
            />
          )}

          {/* Hook Details */}
          <div className="bg-dark-bg rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">
                סוג: {HOOK_TYPE_LABELS[selected.hookType] || selected.hookType}
              </span>
              <span className="text-xs text-green-400 bg-green-400/10 px-2 py-0.5 rounded">
                עובד על מיוט
              </span>
            </div>
            <p className="text-white text-sm font-medium" dir="rtl">
              "{selected.textOverlay}"
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {selected.videoUrl && (
              <a
                href={selected.videoUrl}
                download
                className="gradient-purple px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
              >
                הורד גרסה {String.fromCharCode(65 + variations.findIndex(v => v.id === selected.id))}
              </a>
            )}
            <button
              onClick={() => setWinner(selected.id)}
              className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                winner === selected.id
                  ? 'border-green-500 bg-green-500/20 text-green-400'
                  : 'border-dark-border-light text-gray-300 hover:border-gray-500'
              }`}
            >
              {winner === selected.id ? 'נבחר כמנצח' : 'בחר כמנצח'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
