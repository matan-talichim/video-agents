export interface AuditStep {
  name: string;
  category: string;
  status: 'passed' | 'failed' | 'skipped' | 'not-connected';
  input: string;
  output: string;
  details: string;
  timestamp: number;
  durationMs: number;
}

export interface AuditReport {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  notConnected: number;
  steps: AuditStep[];
  criticalIssues: string[];
  summary: string;
}

export class PipelineAudit {
  steps: AuditStep[] = [];
  startTime: number = Date.now();

  log(name: string, category: string, status: AuditStep['status'], details: string, input?: string, output?: string) {
    this.steps.push({
      name,
      category,
      status,
      input: input || '',
      output: output || '',
      details,
      timestamp: Date.now(),
      durationMs: Date.now() - this.startTime,
    });

    const icon = status === 'passed' ? '✅' : status === 'failed' ? '❌' : status === 'skipped' ? '⏭️' : '🔌';
    console.log(`[AUDIT] ${icon} ${category} > ${name}: ${details}`);
  }

  getReport(): AuditReport {
    const passed = this.steps.filter(s => s.status === 'passed').length;
    const failed = this.steps.filter(s => s.status === 'failed').length;
    const skipped = this.steps.filter(s => s.status === 'skipped').length;
    const notConnected = this.steps.filter(s => s.status === 'not-connected').length;
    const total = this.steps.length;

    const criticalIssues = this.steps
      .filter(s => s.status === 'failed' || s.status === 'not-connected')
      .map(s => `${s.category} > ${s.name}: ${s.details}`);

    return {
      total, passed, failed, skipped, notConnected,
      steps: this.steps,
      criticalIssues,
      summary: `${passed}/${total} passed | ${failed} failed | ${skipped} skipped | ${notConnected} not connected`,
    };
  }
}
