import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Estimate cost accounting for prompt caching discounts
function estimateCost(usage: any): number {
  const inputPrice = 3.0 / 1_000_000;       // $3/M input tokens (Sonnet)
  const outputPrice = 15.0 / 1_000_000;     // $15/M output tokens (Sonnet)
  const cacheWritePrice = 3.75 / 1_000_000; // $3.75/M for cache writes
  const cacheReadPrice = 0.30 / 1_000_000;  // $0.30/M for cache reads (90% off)

  const cacheReadTokens = usage.cache_read_input_tokens || 0;
  const cacheWriteTokens = usage.cache_creation_input_tokens || 0;
  const regularInputTokens = (usage.input_tokens || 0) - cacheReadTokens;
  const outputTokens = usage.output_tokens || 0;

  return (regularInputTokens * inputPrice) +
         (cacheWriteTokens * cacheWritePrice) +
         (cacheReadTokens * cacheReadPrice) +
         (outputTokens * outputPrice);
}

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
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: userMessage }],
      });

      const duration = Date.now() - startTime;
      const usage = response.usage as any;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      const cost = estimateCost(usage);

      console.log(
        `[Claude API] Response received — ${duration}ms — ` +
        `tokens: ${inputTokens} in / ${outputTokens} out — ` +
        `estimated cost: $${cost.toFixed(4)}`
      );
      if (usage?.cache_creation_input_tokens) {
        console.log(`[Claude API] Cache WRITE: ${usage.cache_creation_input_tokens} tokens cached`);
      }
      if (usage?.cache_read_input_tokens) {
        console.log(`[Claude API] Cache HIT: ${usage.cache_read_input_tokens} tokens from cache (90% discount)`);
      }

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
        system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content }],
      });

      const duration = Date.now() - startTime;
      const usage = response.usage as any;
      const inputTokens = usage?.input_tokens || 0;
      const outputTokens = usage?.output_tokens || 0;
      const cost = estimateCost(usage);

      console.log(
        `[Claude Vision] Response received — ${duration}ms — ` +
        `tokens: ${inputTokens} in / ${outputTokens} out — ` +
        `estimated cost: $${cost.toFixed(4)}`
      );
      if (usage?.cache_creation_input_tokens) {
        console.log(`[Claude Vision] Cache WRITE: ${usage.cache_creation_input_tokens} tokens cached`);
      }
      if (usage?.cache_read_input_tokens) {
        console.log(`[Claude Vision] Cache HIT: ${usage.cache_read_input_tokens} tokens from cache (90% discount)`);
      }

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
