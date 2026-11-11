const { Router } = require('express');
const { ADMINISTRADOR } = require('../../../shared/constants/roles');

function buildProxyUrl(baseUrl, path, query) {
  const searchParams = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return `${baseUrl}${path}${queryString ? `?${queryString}` : ''}`;
}

async function proxyToUserService(req, res, userServiceUrl, path, method, fetchImpl) {
  const headers = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) {
    headers.Authorization = req.headers.authorization;
  }
  if (req.authUser?.id_usuario) {
    headers['x-user-id'] = String(req.authUser.id_usuario);
  }
  if (req.authUser?.rol) {
    headers['x-user-role'] = String(req.authUser.rol);
  }
  if (req.authUser?.nombre) {
    headers['x-user-name'] = String(req.authUser.nombre);
  }

  const response = await fetchImpl(buildProxyUrl(userServiceUrl, path, req.query), {
    method,
    headers,
    body: method === 'POST' || method === 'PUT' ? JSON.stringify(req.body || {}) : undefined,
  });

  const data = await response.json();
  return res.status(response.status).json(data);
}

function requireRoles(allowedRoles) {
  return function roleGuard(req, res, next) {
    const role = req.authUser?.rol;
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'AUTH_FORBIDDEN',
          message: 'No tiene permisos para esta operacion',
        },
      });
    }

    return next();
  };
}

function createUserRoutes({ userServiceUrl, authMiddleware, fetchImpl = fetch }) {
  const router = Router();

  router.post(
    '/',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        '/api/users',
        'POST',
        fetchImpl
      ).catch(next)
  );

  router.get(
    '/',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        '/api/users',
        'GET',
        fetchImpl
      ).catch(next)
  );

  router.get(
    '/:id',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        `/api/users/${req.params.id}`,
        'GET',
        fetchImpl
      ).catch(next)
  );

  router.put(
    '/:id',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        `/api/users/${req.params.id}`,
        'PUT',
        fetchImpl
      ).catch(next)
  );

  router.delete(
    '/:id',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        `/api/users/${req.params.id}`,
        'DELETE',
        fetchImpl
      ).catch(next)
  );

  router.post(
    '/:id/desbloquear',
    authMiddleware,
    requireRoles([ADMINISTRADOR]),
    (req, res, next) =>
      proxyToUserService(
        req,
        res,
        userServiceUrl,
        `/api/users/${encodeURIComponent(req.params.id)}/desbloquear`,
        'POST',
        fetchImpl
      ).catch(next)
  );

  return router;
}

module.exports = { createUserRoutes };
