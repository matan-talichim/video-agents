import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';

// Cinematic step display map — user-friendly descriptions (no technical details)
const STEP_DISPLAY_MAP: Record<string, { icon: string; label: string; description: string }> = {
  'transcribing': {
    icon: '🎙️',
    label: 'מקשיב לסרטון',
    description: 'מבין את התוכן ומזהה כל מילה',
  },
  'analyzing': {
    icon: '🧠',
    label: 'מנתח את הסיפור',
    description: 'מזהה רגעים מעניינים ובוחר את הקטעים הטובים ביותר',
  },
  'planning': {
    icon: '🎬',
    label: 'מתכנן את העריכה',
    description: 'בונה תוכנית עריכה קולנועית',
  },
  'generating-broll': {
    icon: '🎨',
    label: 'יוצר קליפים מקוריים',
    description: 'מייצר וידאו AI שמתאים בדיוק לתוכן',
  },
  'generating-music': {
    icon: '🎵',
    label: 'בוחר מוזיקה',
    description: 'מתאים פסקול שמחזק את המסר',
  },
  'editing-cuts': {
    icon: '✂️',
    label: 'חותך ומעצב',
    description: 'מסיר חלקים חלשים ושומר רק את הטוב ביותר',
  },
  'editing-effects': {
    icon: '✨',
    label: 'מוסיף אפקטים',
    description: 'זומים, מעברים, ואפקטים ויזואליים',
  },
  'editing-broll': {
    icon: '🎞️',
    label: 'משלב קליפים',
    description: 'מכניס B-Roll ברגעים המדויקים',
  },
  'editing-subtitles': {
    icon: '📝',
    label: 'מוסיף כתוביות',
    description: 'כתוביות מעוצבות שמושכות תשומת לב',
  },
  'editing-music': {
    icon: '🎵',
    label: 'מערבב שמע',
    description: 'מאזן מוזיקה, דיבור ואפקטי קול',
  },
  'editing-color': {
    icon: '🎨',
    label: 'מתאים צבעים',
    description: 'צביעה קולנועית לאווירה מושלמת',
  },
  'quality-check': {
    icon: '🔍',
    label: 'בודק איכות',
    description: 'וידוא שהכל מושלם לפני הסיום',
  },
  'finalizing': {
    icon: '🏁',
    label: 'מסיים',
    description: 'ממלא את הנגיעות האחרונות',
  },
};

// Map technical step names from the backend to our display keys
function mapStepKey(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes('תמלול') || lower.includes('transcrib')) return 'transcribing';
  if (lower.includes('מנתח') || lower.includes('analyz') || lower.includes('ניתוח')) return 'analyzing';
  if (lower.includes('מתכנן') || lower.includes('plan') || lower.includes('מכין')) return 'planning';
  if (lower.includes('b-roll') || lower.includes('broll') || lower.includes('קליפ')) return 'generating-broll';
  if (lower.includes('מוזיק') || lower.includes('music')) return 'generating-music';
  if (lower.includes('חותך') || lower.includes('cut') || lower.includes('עריכה') || lower.includes('edit')) return 'editing-cuts';
  if (lower.includes('אפקט') || lower.includes('effect') || lower.includes('zoom') || lower.includes('זום')) return 'editing-effects';
  if (lower.includes('כתובי') || lower.includes('subtitle')) return 'editing-subtitles';
  if (lower.includes('שמע') || lower.includes('audio') || lower.includes('mix')) return 'editing-music';
  if (lower.includes('צבע') || lower.includes('color') || lower.includes('grad')) return 'editing-color';
  if (lower.includes('בדיק') || lower.includes('qa') || lower.includes('quality') || lower.includes('check')) return 'quality-check';
  if (lower.includes('ייצוא') || lower.includes('export') || lower.includes('מסיים') || lower.includes('final')) return 'finalizing';
  return raw;
}

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  useEffect(() => {
    if (!id) return;
    fetchJob(id);
    intervalRef.current = setInterval(() => {
      fetchJob(id);
    }, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [id, fetchJob]);

  // Track completed steps and redirect based on status
  useEffect(() => {
    if (!currentJob) return;

    // If job is in preview status, redirect to preview page
    if (currentJob.status === 'preview' || (currentJob.status === 'planning' && !currentJob.approvedAt)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate(`/jobs/${id}/preview`, { replace: true });
      return;
    }

    // Track completed pipeline steps
    const jobAny = currentJob as any;
    if (jobAny.completedPipelineSteps) {
      setCompletedSteps(jobAny.completedPipelineSteps);
    }

    if (currentJob.status === 'done') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const timer = setTimeout(() => {
        navigate(`/jobs/${id}/result`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentJob?.status, currentJob?.approvedAt, currentJob?.progress, id, navigate]);

  if (!currentJob && !error) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-pulse">🎬</div>
          <p className="text-gray-400">טוען פרויקט...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center flex-col">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-400 mb-2">שגיאה בעריכה</h2>
        <p className="text-sm text-gray-500 mb-5">{error}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  const job = currentJob!;
  const progress = job.progress || 0;

  // Resolve current step to display info
  const currentStepKey = job.currentStep ? mapStepKey(job.currentStep) : 'analyzing';
  const currentStepInfo = STEP_DISPLAY_MAP[currentStepKey] || {
    icon: '⏳',
    label: job.currentStep || 'מעבד...',
    description: '',
  };

  if (job.status === 'error') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center flex-col p-8">
        <div className="text-5xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-red-400 mb-2">שגיאה בעריכה</h2>
        <p className="text-sm text-gray-500 mb-5">{job.error || 'Pipeline failed'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-accent-purple text-white rounded-lg hover:bg-accent-purple/80 transition-colors"
        >
          חזרה לדף הבית
        </button>
      </div>
    );
  }

  if (job.status === 'done') {
    return (
      <div dir="rtl" className="min-h-screen bg-[#0a0a1a] text-white flex items-center justify-center flex-col">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-2">הסרטון מוכן!</h2>
        <p className="text-sm text-gray-400">מעביר לתוצאה...</p>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#0a0a1a] text-white flex flex-col items-center justify-center p-8">
      {/* Main animated icon */}
      <div className="text-6xl mb-6" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
        {currentStepInfo.icon}
      </div>

      {/* Current step label */}
      <h2 className="text-2xl md:text-3xl font-bold mb-2">{currentStepInfo.label}</h2>

      {/* Description */}
      <p className="text-base text-gray-500 mb-8">{currentStepInfo.description}</p>

      {/* Progress bar */}
      <div className="w-full max-w-md mb-10">
        <div className="bg-white/10 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <div className="text-center mt-2 text-sm text-gray-500 font-mono">{progress}%</div>
      </div>

      {/* Completed steps timeline */}
      <div className="w-full max-w-lg space-y-1">
        {completedSteps.map((stepKey, i) => {
          const stepInfo = STEP_DISPLAY_MAP[stepKey] || { icon: '✅', label: stepKey, description: '' };
          return (
            <div
              key={stepKey}
              className="flex items-center gap-3 py-1.5 text-gray-500"
              style={{ animation: `fadeIn 0.3s ease ${i * 0.1}s both` }}
            >
              <span className="text-sm">✅</span>
              <span className="text-sm">{stepInfo.label}</span>
            </div>
          );
        })}

        {/* Current step — highlighted */}
        <div className="flex items-center gap-3 py-1.5 font-bold">
          <span className="text-sm" style={{ animation: 'spin 2s linear infinite' }}>⏳</span>
          <span className="text-sm text-accent-purple-light">{currentStepInfo.label}...</span>
        </div>
      </div>

      {/* Project name (subtle) */}
      {job.projectName && (
        <p className="mt-10 text-xs text-gray-700">{job.projectName}</p>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 0.5; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
