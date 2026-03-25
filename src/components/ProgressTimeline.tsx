import type { StepProgress } from '../types';

interface Props {
  steps: StepProgress[];
  currentStep?: string;
}

function statusIcon(status: StepProgress['status']) {
  switch (status) {
    case 'done': return '✅';
    case 'running': return '🔄';
    case 'error': return '❌';
    case 'skipped': return '⏭️';
    default: return '⏳';
  }
}

export default function ProgressTimeline({ steps, currentStep }: Props) {
  return (
    <div className="space-y-1">
      {steps.map((step) => {
        const isActive = step.id === currentStep;
        return (
          <div
            key={step.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
              isActive
                ? 'bg-accent-purple/10 border border-accent-purple/30'
                : 'bg-dark-card border border-transparent'
            }`}
          >
            <span className={`text-lg flex-shrink-0 ${step.status === 'running' ? 'animate-spin' : ''}`}>
              {statusIcon(step.status)}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.status === 'done' ? 'text-gray-400' : ''}`}>
                {step.nameHe}
              </p>
              {step.status === 'running' && (
                <div className="mt-1.5 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-purple rounded-full transition-all duration-500"
                    style={{ width: `${step.progress}%` }}
                  />
                </div>
              )}
              {step.error && (
                <p className="text-xs text-red-400 mt-1">{step.error}</p>
              )}
            </div>
            {step.status === 'running' && (
              <span className="text-xs text-accent-purple-light font-mono">
                {step.progress}%
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
