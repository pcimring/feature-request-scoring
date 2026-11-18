/** USD per 1M tokens (Claude API list prices, 2026-11). */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-opus-5-5": { input: 4, output: 20 },
};

export class BudgetExceededError extends Error {
  constructor(totalUsd: number, limitUsd: number) {
    super(`Spend reached $${totalUsd.toFixed(2)}, over the $${limitUsd.toFixed(2)} limit. Stopping.`);
    this.name = "BudgetExceededError";
  }
}

export class CostMeter {
  private total = 0;
  private readonly limitUsd: number;

  constructor(limitUsd: number) {
    this.limitUsd = limitUsd;
  }

  add(model: string, usage: { input_tokens: number; output_tokens: number }): void {
    const price = PRICES[model];
    if (!price) throw new Error(`No price known for model ${model}`);
    this.total += (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000;
    if (this.total > this.limitUsd) throw new BudgetExceededError(this.total, this.limitUsd);
  }

  get totalUsd(): number {
    return this.total;
  }
}
