import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useJobStore from '../store/useJobStore';

// ============ STEP DEFINITIONS ============

// Pre-preview (analysis) steps
const PRE_PREVIEW_STEPS = [
  { key: 'classifying',        icon: '📋', label: 'מסווג סרטון' },
  { key: 'uploading',          icon: '📤', label: 'מעלה סרטון' },
  { key: 'stabilizing',        icon: '📷', label: 'מייצב תמונה' },
  { key: 'transcribing',       icon: '🎙️', label: 'מקשיב לסרטון' },
  { key: 'detecting-speakers', icon: '👤', label: 'מזהה את הדובר' },
  { key: 'analyzing',          icon: '🧠', label: 'מנתח את הסיפור' },
  { key: 'planning',           icon: '🎬', label: 'מתכנן עריכה' },
];

// Post-approval (rendering) steps
const POST_APPROVAL_STEPS = [
  { key: 'generating-broll',   icon: '🎨', label: 'יוצר קליפים' },
  { key: 'generating-music',   icon: '🎵', label: 'בוחר מוזיקה' },
  { key: 'editing-cuts',       icon: '✂️', label: 'חותך ומעצב' },
  { key: 'editing-effects',    icon: '✨', label: 'מוסיף אפקטים' },
  { key: 'editing-broll',      icon: '🎞️', label: 'משלב קליפים' },
  { key: 'editing-subtitles',  icon: '📝', label: 'כתוביות' },
  { key: 'editing-music',      icon: '🎵', label: 'מערבב שמע' },
  { key: 'editing-audio',      icon: '🔊', label: 'עיבוד שמע' },
  { key: 'editing-color',      icon: '🎨', label: 'צביעה קולנועית' },
  { key: 'quality-check',      icon: '🔍', label: 'בודק איכות' },
  { key: 'finalizing',         icon: '🏁', label: 'מסיים' },
];

// All steps combined for lookup
const ALL_STEPS: Record<string, { icon: string; label: string }> = {};
[...PRE_PREVIEW_STEPS, ...POST_APPROVAL_STEPS].forEach(s => {
  ALL_STEPS[s.key] = { icon: s.icon, label: s.label };
});

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

  // Determine phase: pre-preview or post-approval
  const isPostApproval = !!(currentJob as any)?.approvedAt;
  const phaseSteps = isPostApproval ? POST_APPROVAL_STEPS : PRE_PREVIEW_STEPS;

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

  // Find current step info
  const currentStep = ALL_STEPS[currentStepKey] || { icon: '⏳', label: currentStepKey };

  // Categorize steps for display
  const completedPhaseSteps = phaseSteps.filter(s => completedStepKeys.has(s.key));
  const currentPhaseStep = phaseSteps.find(s => s.key === currentStepKey && !completedStepKeys.has(s.key));
  const upcomingPhaseSteps = phaseSteps.filter(s => !completedStepKeys.has(s.key) && s.key !== currentStepKey);

  // Loading state
  if (!currentJob && !error) {
    return (
      <div dir="rtl" style={styles.container}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'pulse 2.5s ease-in-out infinite', filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.4))' }}>🎬</div>
            <p style={{ opacity: 0.4, fontFamily: "'Heebo', sans-serif", fontSize: '18px' }}>טוען פרויקט...</p>
          </div>
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
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>❌</div>
          <h1 style={{ fontSize: '32px', marginBottom: '12px', fontFamily: "'Heebo', sans-serif" }}>שגיאה בעריכה</h1>
          <p style={{ opacity: 0.5, fontSize: '16px', maxWidth: '400px', textAlign: 'center', fontFamily: "'Heebo', sans-serif" }}>{error}</p>
          <button onClick={() => navigate('/')} style={styles.errorButton}>
            חזרה לדף הבית
          </button>
        </div>
        <style>{animationCSS}</style>
      </div>
    );
  }

  const job = currentJob!;

  // Error state (from job)
  if (job.status === 'error') {
    return (
      <div dir="rtl" style={styles.container}>
        <div style={styles.errorBox}>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>❌</div>
          <h1 style={{ fontSize: '32px', marginBottom: '12px', fontFamily: "'Heebo', sans-serif" }}>שגיאה בעריכה</h1>
          <p style={{ opacity: 0.5, fontSize: '16px', maxWidth: '400px', textAlign: 'center', fontFamily: "'Heebo', sans-serif" }}>{job.error || 'שגיאה בעיבוד'}</p>
          <button onClick={() => navigate('/')} style={styles.errorButton}>
            חזרה לדף הבית
          </button>
        </div>
        <style>{animationCSS}</style>
      </div>
    );
  }

  return (
    <div dir="rtl" style={styles.container}>

      {/* Background animated gradient orbs */}
      <div style={styles.bgOrb1} />
      <div style={styles.bgOrb2} />

      {/* Main content — centered */}
      <div style={styles.mainContent}>

        {/* Project name */}
        <h2 style={styles.projectName}>
          {job.projectName || ''}
        </h2>

        {/* Main animated icon — LARGE */}
        <div style={styles.mainIcon}>
          {currentStep.icon}
        </div>

        {/* Current step label — LARGE with gradient shimmer */}
        <h1 style={styles.mainLabel}>
          {currentStep.label}
        </h1>

        {/* Progress percentage — LARGE */}
        <div style={styles.percentage}>
          {maxProgress}%
        </div>

        {/* Progress bar — WIDE */}
        <div style={styles.progressOuter}>
          <div style={styles.progressTrack}>
            <div style={{
              ...styles.progressFill,
              width: `${maxProgress}%`,
            }} />
          </div>
        </div>

        {/* Steps timeline — glass card */}
        <div style={styles.stepsCard}>
          {/* Completed steps */}
          {completedPhaseSteps.map((step, i) => (
            <div key={step.key} style={{
              ...styles.stepRow,
              borderBottom: '1px solid rgba(255,255,255,0.04)',
              animation: `fadeSlideIn 0.4s ease ${i * 0.05}s both`,
            }}>
              <span style={styles.stepCheckmark}>✓</span>
              <span style={styles.stepCompletedLabel}>{step.label}</span>
            </div>
          ))}

          {/* Current step — highlighted */}
          {currentPhaseStep && (
            <div style={{
              ...styles.stepRow,
              borderBottom: upcomingPhaseSteps.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={styles.stepSpinner}>⏳</span>
              <span style={styles.stepCurrentLabel}>
                {currentPhaseStep.label}...
              </span>
            </div>
          )}

          {/* Future steps — numbered, very faded */}
          {upcomingPhaseSteps.map((step, i) => (
            <div key={step.key} style={{
              ...styles.stepRow,
              opacity: 0.25,
              borderBottom: i < upcomingPhaseSteps.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <span style={styles.stepNumber}>{completedPhaseSteps.length + (currentPhaseStep ? 1 : 0) + i + 1}</span>
              <span style={styles.stepFutureLabel}>{step.label}</span>
            </div>
          ))}
        </div>

        {/* Elapsed time — subtle at bottom */}
        <div style={styles.elapsedTime}>
          ⏱️ {Math.floor(elapsedSeconds / 60)}:{(elapsedSeconds % 60).toString().padStart(2, '0')}
        </div>
      </div>

      {/* Completion animation */}
      {maxProgress >= 100 && (
        <div style={styles.completionOverlay}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '100px', marginBottom: '24px', animation: 'pulse 2.5s ease-in-out infinite' }}>🎬</div>
            <h2 style={{ fontSize: '32px', fontFamily: "'Heebo', sans-serif", marginBottom: '8px' }}>הסרטון מוכן!</h2>
            <p style={{ opacity: 0.5, fontFamily: "'Heebo', sans-serif", fontSize: '16px' }}>מעביר לתצוגה...</p>
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
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-30px); }
  }
  @keyframes shimmer {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateX(20px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes bgFloat {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-30px); }
  }
  @keyframes completionZoom {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
  }
  @keyframes progressGlow {
    0% { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`;

// ============ STYLES ============

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2a 50%, #0a0a1a 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    position: 'relative',
    overflow: 'hidden',
  },

  bgOrb1: {
    position: 'absolute',
    top: '20%',
    right: '10%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)',
    animation: 'bgFloat 8s ease-in-out infinite',
    pointerEvents: 'none' as const,
  },

  bgOrb2: {
    position: 'absolute',
    bottom: '10%',
    left: '15%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)',
    animation: 'bgFloat 6s ease-in-out infinite reverse',
    pointerEvents: 'none' as const,
  },

  mainContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
    width: '100%',
    maxWidth: '600px',
  },

  projectName: {
    fontSize: '20px',
    fontWeight: 500,
    opacity: 0.4,
    marginBottom: '60px',
    letterSpacing: '2px',
    fontFamily: "'Heebo', sans-serif",
  },

  mainIcon: {
    fontSize: '100px',
    marginBottom: '32px',
    animation: 'pulse 2.5s ease-in-out infinite',
    filter: 'drop-shadow(0 0 30px rgba(124,58,237,0.4))',
  },

  mainLabel: {
    fontSize: '36px',
    fontWeight: 'bold',
    marginBottom: '12px',
    fontFamily: "'Heebo', sans-serif",
    background: 'linear-gradient(90deg, #a78bfa, #818cf8, #a78bfa)',
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animation: 'shimmer 3s linear infinite',
    textAlign: 'center' as const,
  },

  percentage: {
    fontSize: '64px',
    fontWeight: 200,
    marginBottom: '40px',
    opacity: 0.3,
    fontFamily: 'system-ui, sans-serif',
  },

  progressOuter: {
    width: '100%',
    maxWidth: '600px',
    marginBottom: '60px',
  },

  progressTrack: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '12px',
    height: '12px',
    overflow: 'hidden',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
  },

  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #7c3aed, #818cf8, #a78bfa)',
    backgroundSize: '200% auto',
    borderRadius: '12px',
    transition: 'width 0.8s ease',
    animation: 'progressGlow 2s linear infinite',
    boxShadow: '0 0 20px rgba(124,58,237,0.5)',
  },

  stepsCard: {
    width: '100%',
    maxWidth: '500px',
    background: 'rgba(255,255,255,0.03)',
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.06)',
  },

  stepRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '10px 0',
  },

  stepCheckmark: {
    fontSize: '18px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(34,197,94,0.15)',
    borderRadius: '8px',
    flexShrink: 0,
  },

  stepCompletedLabel: {
    fontSize: '15px',
    opacity: 0.5,
    fontFamily: "'Heebo', sans-serif",
  },

  stepSpinner: {
    fontSize: '20px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    animation: 'spin 2s linear infinite',
    flexShrink: 0,
  },

  stepCurrentLabel: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#a78bfa',
    fontFamily: "'Heebo', sans-serif",
  },

  stepNumber: {
    fontSize: '12px',
    fontWeight: 700,
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.4)',
    flexShrink: 0,
  },

  stepFutureLabel: {
    fontSize: '15px',
    color: 'rgba(255,255,255,0.5)',
    fontFamily: "'Heebo', sans-serif",
  },

  elapsedTime: {
    marginTop: '32px',
    opacity: 0.3,
    fontSize: '14px',
    fontFamily: "'Heebo', sans-serif",
  },

  completionOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, rgba(10,10,26,0.97) 0%, rgba(26,10,42,0.97) 50%, rgba(10,10,26,0.97) 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    animation: 'completionZoom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  errorBox: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },

  errorButton: {
    marginTop: '32px',
    padding: '14px 32px',
    background: '#7c3aed',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Heebo', sans-serif",
  },
};
