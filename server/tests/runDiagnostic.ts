// server/tests/runDiagnostic.ts — CLI runner for full system diagnostic
import { runFullDiagnostic } from './fullDiagnostic.js';

(async () => {
  console.log('Starting full system diagnostic...\n');
  const result = await runFullDiagnostic();

  if (result.overall === 'FAIL') {
    console.log('\nSYSTEM HAS CRITICAL ISSUES — Fix the failed items above before running videos.');
    process.exit(1);
  } else if (result.overall === 'PARTIAL') {
    console.log('\nSYSTEM WORKS BUT WITH WARNINGS — Some features may be limited.');
    process.exit(0);
  } else {
    console.log('\nALL SYSTEMS GO — Ready to edit videos.');
    process.exit(0);
  }
})();
