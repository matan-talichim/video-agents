import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';

// Step definitions — user-friendly labels, NO technical jargon
const PIPELINE_STEPS = [
  { key: 'uploading',          icon: '📤', label: 'מעלה סרטון',           description: 'מכין את הקובץ לעיבוד' },
  { key: 'detecting-speakers', icon: '👤', label: 'מזהה את הדובר',        description: 'מסנן רעשי רקע ועוזרי הפקה' },
  { key: 'transcribing',       icon: '🎙️', label: 'מקשיב לסרטון',        description: 'מבין כל מילה ומזהה את הרגעים החשובים' },
  { key: 'analyzing',          icon: '🧠', label: 'מנתח את הסיפור',       description: 'בוחר את הקטעים הכי טובים' },
  { key: 'planning',           icon: '🎬', label: 'מתכנן עריכה',         description: 'בונה תוכנית עריכה קולנועית מותאמת' },
  { key: 'generating-broll',   icon: '🎨', label: 'יוצר קליפים',          description: 'מייצר תוכן ויזואלי מקורי' },
  { key: 'generating-music',   icon: '🎵', label: 'מתאים מוזיקה',         description: 'בוחר פסקול שמחזק את המסר' },
  { key: 'editing-cuts',       icon: '✂️', label: 'עורך וחותך',           description: 'מרכיב את הסרטון מהקטעים הטובים' },
  { key: 'editing-effects',    icon: '✨', label: 'אפקטים ויזואליים',     description: 'זומים, מעברים, ודינמיקה' },
  { key: 'editing-subtitles',  icon: '📝', label: 'כתוביות מעוצבות',      description: 'טקסט מסונכרן לדיבור' },
  { key: 'editing-audio',      icon: '🔊', label: 'עיבוד שמע',           description: 'איזון מוזיקה, דיבור ואפקטים' },
  { key: 'quality-check',      icon: '🔍', label: 'בדיקת איכות',          description: 'וידוא שהכל מושלם' },
  { key: 'finalizing',         icon: '🏁', label: 'ממלא נגיעות אחרונות',  description: 'מכין את הסרטון להצגה' },
];

// Steps that are internal/technical — don't show to user
const HIDDEN_STEPS = ['content-safety', 'brand-compliance', 'device-preview', 'text-readability'];

export default function ProcessingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentJob, fetchJob, error } = useJobStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [maxProgress, setMaxProgress] = useState(0);
  const [completedStepKeys, setCompletedStepKeys] = useState<Set<string>>(new Set());
  const [currentStepKey, setCurrentStepKey] = useState('uploading');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Poll job status every 2 seconds
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

  // React to job changes
  useEffect(() => {
    if (!currentJob) return;

    // If job is in preview status, redirect to preview page
    if (currentJob.status === 'preview' || (currentJob.status === 'planning' && !(currentJob as any).approvedAt)) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      navigate(`/jobs/${id}/preview`, { replace: true });
      return;
    }

    // Progress only goes UP
    const newProgress = Math.max(maxProgress, currentJob.progress || 0);
    setMaxProgress(newProgress);

    // Update current step
    if (currentJob.currentStep && !HIDDEN_STEPS.includes(currentJob.currentStep)) {
      setCurrentStepKey(currentJob.currentStep);
    }

    // Completed steps only ADDED, never removed
    const jobAny = currentJob as any;
    if (jobAny.completedPipelineSteps) {
      setCompletedStepKeys(prev => {
        const next = new Set(prev);
        jobAny.completedPipelineSteps
          .filter((s: string) => !HIDDEN_STEPS.includes(s))
          .forEach((s: string) => next.add(s));
        return next;
      });
    }

    if (currentJob.status === 'done') {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setMaxProgress(100);
      const timer = setTimeout(() => navigate(`/jobs/${id}/result`), 2000);
      return () => clearTimeout(timer);
    }
  }, [currentJob?.status, currentJob?.progress, currentJob?.currentStep, (currentJob as any)?.completedPipelineSteps, id, navigate]);

  // Format elapsed time
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Find current step info
  const currentStep = PIPELINE_STEPS.find(s => s.key === currentStepKey) || PIPELINE_STEPS[0];

  // Loading state
  if (!currentJob && !error) {
    return (
      <div dir="rtl" style={styles.container}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '56px', marginBottom: '16px', animation: 'pulse 2s ease-in-out infinite' }}>🎬</div>
          <p style={{ opacity: 0.4, fontFamily: "'Heebo', sans-serif" }}>טוען פרויקט...</p>
        </div>
        <style>{animationCSS}</style>
      </div>
    );
  }

  // Error state (from store)
  if (error) {
    return (
      <div dir="rtl" style={styles.container}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ marginBottom: '8px', fontFamily: "'Heebo', sans-serif" }}>שגיאה בעריכה</h2>
          <p style={{ opacity: 0.6, marginBottom: '24px', fontFamily: "'Heebo', sans-serif" }}>{error}</p>
          <button onClick={() => navigate('/')} style={styles.errorButton}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  const job = currentJob!;

  // Error state (from job)
  if (job.status === 'error') {
    return (
      <div dir="rtl" style={styles.container}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: '56px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ marginBottom: '8px', fontFamily: "'Heebo', sans-serif" }}>שגיאה בעריכה</h2>
          <p style={{ opacity: 0.6, marginBottom: '24px', fontFamily: "'Heebo', sans-serif" }}>{job.error || 'Pipeline failed'}</p>
          <button onClick={() => navigate('/')} style={styles.errorButton}>
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" style={styles.container}>

      {/* Animated background gradient */}
      <div style={styles.bgGlow} />
      <div style={styles.bgGlow2} />

      {/* Top bar — elapsed time */}
      <div style={styles.topBar}>
        <span style={{ opacity: 0.4, fontSize: '13px', fontFamily: "'Heebo', sans-serif" }}>⏱️ {formatTime(elapsedSeconds)}</span>
        <span style={{ opacity: 0.4, fontSize: '13px', fontFamily: "'Heebo', sans-serif" }}>{maxProgress}%</span>
      </div>

      {/* Main content */}
      <div style={styles.mainContent}>

        {/* Current step — big animated display */}
        <div style={styles.currentStepBox}>
          <div style={styles.currentIcon}>{currentStep.icon}</div>
          <h1 style={styles.currentLabel}>{currentStep.label}</h1>
          <p style={styles.currentDescription}>{currentStep.description}</p>
        </div>

        {/* Progress bar — full width, glowing */}
        <div style={styles.progressContainer}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${maxProgress}%`,
            }}>
              <div style={styles.progressGlow} />
            </div>
          </div>
        </div>

        {/* Steps timeline — vertical list */}
        <div style={styles.stepsTimeline}>
          {/* Completed steps — always visible */}
          {PIPELINE_STEPS.filter(step => completedStepKeys.has(step.key)).map((step) => (
            <div key={step.key} style={{
              ...styles.stepRow,
              opacity: 0.7,
            }}>
              <div style={{
                ...styles.stepIndicator,
                background: '#22c55e',
              }}>
                ✓
              </div>
              <div style={styles.stepTextBox}>
                <span style={{
                  ...styles.stepLabel,
                  color: '#22c55e',
                }}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}

          {/* Current step — highlighted */}
          {(() => {
            const step = PIPELINE_STEPS.find(s => s.key === currentStepKey);
            if (!step || completedStepKeys.has(step.key)) return null;
            return (
              <div key={step.key} style={{
                ...styles.stepRow,
                opacity: 1,
              }}>
                <div style={{
                  ...styles.stepIndicator,
                  background: '#7c3aed',
                  boxShadow: '0 0 20px rgba(124,58,237,0.5)',
                }}>
                  {step.icon}
                </div>
                <div style={styles.stepTextBox}>
                  <span style={{
                    ...styles.stepLabel,
                    color: '#a78bfa',
                    fontWeight: 700,
                  }}>
                    {step.label}
                  </span>
                  <span style={styles.stepDescription}>{step.description}</span>
                </div>
              </div>
            );
          })()}

          {/* Upcoming steps — dimmed */}
          {PIPELINE_STEPS.filter(step => !completedStepKeys.has(step.key) && step.key !== currentStepKey).map((step, index) => (
            <div key={step.key} style={{
              ...styles.stepRow,
              opacity: 0.2,
            }}>
              <div style={{
                ...styles.stepIndicator,
                background: 'rgba(255,255,255,0.1)',
              }}>
                {index + 1}
              </div>
              <div style={styles.stepTextBox}>
                <span style={{
                  ...styles.stepLabel,
                  color: 'rgba(255,255,255,0.5)',
                }}>
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completion animation */}
      {maxProgress >= 100 && (
        <div style={styles.completionOverlay}>
          <div style={styles.completionContent}>
            <div style={{ fontSize: '72px', marginBottom: '16px' }}>🎬</div>
            <h2 style={{ fontSize: '28px', fontFamily: "'Heebo', sans-serif" }}>הסרטון מוכן!</h2>
            <p style={{ opacity: 0.6, fontFamily: "'Heebo', sans-serif" }}>מעביר לתצוגה...</p>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{animationCSS}</style>
    </div>
  );
}

// ============ ANIMATION CSS ============

const animationCSS = `
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.08); }
  }
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(200%); }
  }
  @keyframes glowPulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }
  @keyframes bgMove {
    0% { transform: translate(0, 0) scale(1); }
    33% { transform: translate(30px, -20px) scale(1.05); }
    66% { transform: translate(-20px, 15px) scale(0.95); }
    100% { transform: translate(0, 0) scale(1); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes completionZoom {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
`;

// ============ STYLES ============

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: '#08080f',
    color: 'white',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  bgGlow: {
    position: 'absolute',
    top: '-30%',
    right: '-20%',
    width: '600px',
    height: '600px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
    animation: 'bgMove 15s ease-in-out infinite',
    pointerEvents: 'none' as const,
  },

  bgGlow2: {
    position: 'absolute',
    bottom: '-20%',
    left: '-15%',
    width: '500px',
    height: '500px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
    animation: 'bgMove 20s ease-in-out infinite reverse',
    pointerEvents: 'none' as const,
  },

  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    position: 'relative',
    zIndex: 1,
  },

  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0 24px',
    position: 'relative',
    zIndex: 1,
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%',
  },

  currentStepBox: {
    textAlign: 'center' as const,
    marginBottom: '40px',
    animation: 'fadeInUp 0.5s ease',
  },

  currentIcon: {
    fontSize: '56px',
    marginBottom: '16px',
    animation: 'float 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 20px rgba(124,58,237,0.3))',
  },

  currentLabel: {
    fontSize: '26px',
    fontWeight: 700,
    margin: '0 0 8px 0',
    fontFamily: "'Heebo', sans-serif",
    letterSpacing: '-0.5px',
  },

  currentDescription: {
    fontSize: '15px',
    margin: 0,
    opacity: 0.45,
    fontFamily: "'Heebo', sans-serif",
  },

  progressContainer: {
    width: '100%',
    marginBottom: '48px',
  },

  progressTrack: {
    width: '100%',
    height: '6px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '10px',
    overflow: 'hidden',
    position: 'relative' as const,
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7c3aed, #a78bfa, #c4b5fd)',
    borderRadius: '10px',
    transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative' as const,
    overflow: 'hidden',
  },

  progressGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
    animation: 'shimmer 2s ease-in-out infinite',
  },

  stepsTimeline: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0',
  },

  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
    position: 'relative' as const,
    paddingBottom: '6px',
    transition: 'opacity 0.4s ease',
  },

  stepIndicator: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    flexShrink: 0,
    transition: 'all 0.4s ease',
    position: 'relative' as const,
    zIndex: 1,
  },

  connectorLine: {
    position: 'absolute' as const,
    right: '13px',
    top: '28px',
    width: '2px',
    height: '16px',
    transition: 'background 0.4s ease',
  },

  stepTextBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    paddingTop: '4px',
  },

  stepLabel: {
    fontSize: '14px',
    transition: 'color 0.3s ease',
    fontFamily: "'Heebo', sans-serif",
  },

  stepDescription: {
    fontSize: '12px',
    opacity: 0.4,
    marginTop: '2px',
    fontFamily: "'Heebo', sans-serif",
  },

  completionOverlay: {
    position: 'fixed' as const,
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(8,8,15,0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'completionZoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  completionContent: {
    textAlign: 'center' as const,
    fontFamily: "'Heebo', sans-serif",
  },

  errorBox: {
    textAlign: 'center' as const,
    padding: '40px',
    fontFamily: "'Heebo', sans-serif",
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
  },

  errorButton: {
    padding: '12px 32px',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif",
  },
};
