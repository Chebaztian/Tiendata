'use strict';

/**
 * Límite de intentos de login fallidos por IP (MS-01).
 *
 * Complementa el bloqueo por cuenta del auth-service: frena a quien prueba
 * contraseñas contra muchas cuentas distintas desde la misma dirección.
 *
 * - Solo cuentan los intentos fallidos (401 credenciales inválidas y
 *   423 cuenta bloqueada); un login exitoso no consume el cupo, así varios
 *   usuarios detrás de la misma red (p. ej. un aula) no se bloquean entre sí.
 * - Ventana deslizante: se consideran los fallos de los últimos `windowMs`.
 * - Al superar el máximo responde 429 AUTH_TOO_MANY_ATTEMPTS con Retry-After.
 * - El estado vive en memoria de cada instancia del gateway.
 */
function createLoginRateLimiter({
  maxFailures = 20,
  windowMs = 15 * 60 * 1000,
  now = () => Date.now(),
  countedStatuses = [401, 423],
} = {}) {
  const failuresByIp = new Map();

  function recentFailures(ip, current) {
    const failures = (failuresByIp.get(ip) || []).filter((time) => current - time < windowMs);
    if (failures.length === 0) failuresByIp.delete(ip);
    else failuresByIp.set(ip, failures);
    return failures;
  }

  // Limpieza periódica de IPs sin fallos recientes (no retiene el proceso)
  const cleanup = setInterval(() => {
    const current = now();
    for (const ip of failuresByIp.keys()) recentFailures(ip, current);
  }, windowMs);
  if (typeof cleanup.unref === 'function') cleanup.unref();

  function middleware(req, res, next) {
    const ip = req.ip || req.socket?.remoteAddress || 'desconocida';
    const current = now();
    const failures = recentFailures(ip, current);

    if (failures.length >= maxFailures) {
      const retryAfterSeconds = Math.max(1, Math.ceil((failures[0] + windowMs - current) / 1000));
      const minutes = Math.ceil(retryAfterSeconds / 60);
      res.set('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        error: {
          code: 'AUTH_TOO_MANY_ATTEMPTS',
          message: `Demasiados intentos fallidos desde esta red. Intenta de nuevo en ${minutes} ${
            minutes === 1 ? 'minuto' : 'minutos'
          }`,
          details: { reintentar_en_segundos: retryAfterSeconds },
        },
      });
    }

    res.on('finish', () => {
      if (countedStatuses.includes(res.statusCode)) {
        const list = failuresByIp.get(ip) || [];
        list.push(now());
        failuresByIp.set(ip, list);
      }
    });

    return next();
  }

  return {
    middleware,
    reset: () => failuresByIp.clear(),
    stop: () => clearInterval(cleanup),
  };
}

module.exports = { createLoginRateLimiter };
