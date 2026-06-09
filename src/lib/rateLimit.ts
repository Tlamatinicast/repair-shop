/**
 * Rate limiter en memoria para el login (anti fuerza bruta).
 *
 * Ventana de 15 min, máx 5 intentos fallidos por correo. Al superarlo,
 * se bloquea ese correo 15 min. Es en memoria del proceso: suficiente para
 * un despliegue de instancia única (Railway). Si algún día escalas a varias
 * instancias, mover esto a Redis o a la base de datos.
 */

type Attempt = { count: number; first: number; lockedUntil?: number };

const WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;

const attempts = new Map<string, Attempt>();

function norm(key: string) {
  return key.toLowerCase().trim();
}

/** Devuelve si el correo puede intentar, y minutos restantes si está bloqueado. */
export function checkRateLimit(key: string): { allowed: boolean; retryMin: number } {
  const now = Date.now();
  const a = attempts.get(norm(key));
  if (a?.lockedUntil && a.lockedUntil > now) {
    return { allowed: false, retryMin: Math.ceil((a.lockedUntil - now) / 60000) };
  }
  return { allowed: true, retryMin: 0 };
}

/** Registra un intento fallido. Bloquea al llegar al máximo. */
export function recordFailure(key: string): void {
  const now = Date.now();
  const k = norm(key);
  let a = attempts.get(k);
  if (!a || now - a.first > WINDOW_MS) {
    a = { count: 0, first: now };
  }
  a.count += 1;
  if (a.count >= MAX_ATTEMPTS) {
    a.lockedUntil = now + WINDOW_MS;
  }
  attempts.set(k, a);
}

/** Limpia el contador tras un login exitoso. */
export function recordSuccess(key: string): void {
  attempts.delete(norm(key));
}
