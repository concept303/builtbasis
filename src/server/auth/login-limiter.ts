export interface LoginLimits {
  windowMs: number;
  maxPerKey: number;
  maxGlobal: number;
}

/** 5 failures per address and 20 overall per 15 minutes. The global cap defeats rotating forged addresses. */
export const DEFAULT_LOGIN_LIMITS: LoginLimits = { windowMs: 15 * 60 * 1000, maxPerKey: 5, maxGlobal: 20 };

/** In-memory failed-login limiter (single process; a restart resets it). */
export class LoginLimiter {
  private readonly failures = new Map<string, number[]>();
  private global: number[] = [];

  constructor(private readonly limits: LoginLimits) {}

  isBlocked(key: string, now: number): boolean {
    this.prune(now);
    return (this.failures.get(key)?.length ?? 0) >= this.limits.maxPerKey || this.global.length >= this.limits.maxGlobal;
  }

  recordFailure(key: string, now: number): void {
    this.prune(now);
    this.failures.set(key, [...(this.failures.get(key) ?? []), now]);
    this.global.push(now);
  }

  recordSuccess(key: string): void {
    this.failures.delete(key);
  }

  private prune(now: number): void {
    const since = now - this.limits.windowMs;
    this.global = this.global.filter((time) => time > since);
    for (const [key, times] of this.failures) {
      const kept = times.filter((time) => time > since);
      if (kept.length > 0) this.failures.set(key, kept);
      else this.failures.delete(key);
    }
  }
}
