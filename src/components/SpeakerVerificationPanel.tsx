import type { VerifiedSpeakerMap } from '../types';

interface Props {
  verification: VerifiedSpeakerMap;
}

const ROLE_LABELS: Record<string, string> = {
  presenter: 'פרזנטור',
  director: 'במאי (מתן הוראות)',
  assistant: 'עוזר (מקריא טקסט)',
  interviewer: 'מראיין',
  background: 'רקע',
  unknown: 'לא מזוהה',
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SpeakerVerificationPanel({ verification }: Props) {
  const { speakers, corrections, confidence } = verification;

  // Find the presenter (on-camera with most time)
  const presenter = speakers
    .filter(s => s.isOnCamera)
    .sort((a, b) => b.totalTime - a.totalTime)[0]
    || speakers.sort((a, b) => b.totalTime - a.totalTime)[0];

  const totalRecordedTime = speakers.reduce((sum, s) => sum + s.totalTime, 0);
  const confidenceColor = confidence >= 0.85 ? 'text-green-400' : confidence >= 0.7 ? 'text-amber-400' : 'text-red-400';
  const confidenceBg = confidence >= 0.85 ? 'bg-green-500/10 border-green-500/20' : confidence >= 0.7 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-xl p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <span className="text-lg">🎤</span>
          אימות דוברים (3 שכבות)
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${confidenceBg} ${confidenceColor}`}>
          ביטחון: {Math.round(confidence * 100)}% {confidence >= 0.85 ? '✅' : '⚠️'}
        </span>
      </div>

      {/* Presenter info */}
      {presenter && (
        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 text-sm">👤</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white font-medium">
                פרזנטור: &quot;{presenter.description}&quot;
              </p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                <span>⏱️ {formatTime(presenter.totalTime)} דיבור מתוך {formatTime(totalRecordedTime)} צולמו</span>
                <span>📍 מול המצלמה {presenter.isOnCamera ? '✅' : '❌'}</span>
              </div>
              {presenter.originalIds.length > 1 && (
                <p className="text-[10px] text-gray-600 mt-0.5">
                  IDs מקוריים: {presenter.originalIds.join(', ')} (אוחדו)
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Corrections */}
      {corrections.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] text-amber-400 font-medium flex items-center gap-1">
            <span>🔧</span> תיקונים ({corrections.length})
          </p>
          {corrections.map((c, i) => (
            <div
              key={i}
              className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2"
            >
              <p className="text-[11px] text-amber-300 font-medium">{c.description}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{c.evidence}</p>
            </div>
          ))}
        </div>
      )}

      {/* Other speakers */}
      {speakers.filter(s => s.id !== presenter?.id).length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] text-gray-400">
            דוברים נוספים ({speakers.filter(s => s.id !== presenter?.id).length}):
          </p>
          {speakers
            .filter(s => s.id !== presenter?.id)
            .map((speaker) => {
              const isKept = speaker.role === 'interviewer' && speaker.isOnCamera;
              return (
                <div
                  key={speaker.id}
                  className={`flex items-center gap-2 text-[11px] rounded-lg px-3 py-2 ${
                    isKept
                      ? 'bg-blue-500/5 border border-blue-500/20'
                      : 'bg-red-500/5 border border-red-500/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    isKept ? 'bg-blue-400' : 'bg-red-400'
                  }`} />
                  <span className="text-gray-300">
                    {speaker.role === 'unknown' ? '❌' : isKept ? '✅' : '❌'}
                    {' '}
                    דובר #{speaker.id}: &quot;{speaker.description}&quot;
                  </span>
                  <span className="text-gray-500">
                    ({ROLE_LABELS[speaker.role] || speaker.role})
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {formatTime(speaker.totalTime)}
                  </span>
                  <span className={`mr-auto text-[10px] ${
                    isKept ? 'text-blue-400' : 'text-red-400'
                  }`}>
                    {isKept ? 'נשמר (על המסך)' : 'יוסר'}
                  </span>
                </div>
              );
            })}
        </div>
      )}

      {/* Verification method */}
      <p className="text-[9px] text-gray-600 text-center pt-1">
        {verification.verificationMethod}
      </p>
    </div>
  );
}
