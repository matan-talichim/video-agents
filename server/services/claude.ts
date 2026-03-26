import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Strip markdown code fences (```json ... ```) that Claude often wraps around JSON responses.
// This prevents JSON.parse failures across the entire codebase.
export function extractJSON(response: string): string {
  let cleaned = response.trim();
  // Remove opening code block: ```json or ``` at the start
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*\n?/, '');
  // Remove closing code block: ``` at the end
  cleaned = cleaned.replace(/\n?```\s*$/, '');
  return cleaned.trim();
}

// Text-only call with retry logic
export async function askClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`[Claude API] Request attempt ${attempt}/${maxRetries} — start`);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      });

      const duration = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const estimatedCost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

      console.log(
        `[Claude API] Response received — ${duration}ms — ` +
        `tokens: ${inputTokens} in / ${outputTokens} out — ` +
        `estimated cost: $${estimatedCost.toFixed(4)}`
      );

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return extractJSON(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Claude API] Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[Claude API] Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  console.error('[Claude API] All retries exhausted');
  throw lastError || new Error('Claude API call failed after retries');
}

// Vision call (text + images) with retry logic
export async function askClaudeVision(systemPrompt: string, content: any[]): Promise<string> {
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const startTime = Date.now();
      console.log(`[Claude Vision] Request attempt ${attempt}/${maxRetries} — start`);

      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: systemPrompt,
        messages: [{ role: 'user', content }],
      });

      const duration = Date.now() - startTime;
      const inputTokens = response.usage?.input_tokens || 0;
      const outputTokens = response.usage?.output_tokens || 0;
      const estimatedCost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;

      console.log(
        `[Claude Vision] Response received — ${duration}ms — ` +
        `tokens: ${inputTokens} in / ${outputTokens} out — ` +
        `estimated cost: $${estimatedCost.toFixed(4)}`
      );

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      return extractJSON(text);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[Claude Vision] Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 1000;
        console.log(`[Claude Vision] Retrying in ${backoffMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }
  }

  console.error('[Claude Vision] All retries exhausted');
  throw lastError || new Error('Claude Vision API call failed after retries');
}
