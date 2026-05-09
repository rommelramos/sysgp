import { RateLimiterMemory } from "rate-limiter-flexible";

// Auth endpoints: 10 req/min por IP
export const authLimiter = new RateLimiterMemory({
  keyPrefix: "auth",
  points: 10,
  duration: 60,
});

// Geral: 100 req/min por IP
export const generalLimiter = new RateLimiterMemory({
  keyPrefix: "general",
  points: 100,
  duration: 60,
});

// Login failures: bloquear após 5 tentativas em 15min por IP+usuário
export const loginFailLimiter = new RateLimiterMemory({
  keyPrefix: "login_fail",
  points: 5,
  duration: 15 * 60,
  blockDuration: 30 * 60,
});

export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    await limiter.consume(key);
    return { allowed: true };
  } catch (err: unknown) {
    const rateLimitErr = err as { msBeforeNext?: number };
    return {
      allowed: false,
      retryAfter: rateLimitErr.msBeforeNext
        ? Math.ceil(rateLimitErr.msBeforeNext / 1000)
        : 60,
    };
  }
}
