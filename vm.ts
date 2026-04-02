export interface VMContext {
  from: string;
  to: string;
  amount: number;
  timestamp: number;
  blockHeight: number;
}

export interface VMResult {
  success: boolean;
  gasUsed: number;
  result: unknown;
  error?: string;
  logs: string[];
}

export class MiniVM {
  private state: Record<string, unknown>;
  private gasLimit: number;
  private gasUsed: number = 0;
  private logs: string[] = [];

  constructor(state: Record<string, unknown>, gasLimit: number = 1_000_000) {
    this.state = { ...state };
    this.gasLimit = gasLimit;
  }

  run(code: string, context: VMContext): VMResult {
    try {
      const sandbox = {
        state: this.state,
        context,
        log: (msg: string) => {
          this.logs.push(String(msg));
          this.gasUsed += 10;
        },
        require: (condition: boolean, msg: string) => {
          if (!condition) throw new Error(msg);
          this.gasUsed += 5;
        },
        transfer: (from: string, to: string, amount: number) => {
          this.gasUsed += 100;
          if (!this.state["balances"]) this.state["balances"] = {};
          const balances = this.state["balances"] as Record<string, number>;
          if ((balances[from] ?? 0) < amount) throw new Error("Insufficient balance in contract");
          balances[from] = (balances[from] ?? 0) - amount;
          balances[to] = (balances[to] ?? 0) + amount;
        },
      };

      const fn = new Function(
        "state",
        "context",
        "log",
        "require",
        "transfer",
        `"use strict"; ${code}`
      );

      const result = fn(
        sandbox.state,
        sandbox.context,
        sandbox.log,
        sandbox.require,
        sandbox.transfer
      );

      if (this.gasUsed > this.gasLimit) {
        throw new Error("Out of gas");
      }

      return {
        success: true,
        gasUsed: this.gasUsed,
        result,
        logs: this.logs,
      };
    } catch (err) {
      return {
        success: false,
        gasUsed: this.gasUsed,
        result: null,
        error: err instanceof Error ? err.message : String(err),
        logs: this.logs,
      };
    }
  }

  getState(): Record<string, unknown> {
    return this.state;
  }
}
