'use strict';

/**
 * API Gateway de TIENDATA.
 *
 * Punto de entrada único para el frontend. Resuelve:
 *   - Autenticación: delega en el auth-service (MS-01) la verificación del
 *     JWT en cada request protegido. El JWT se propaga al microservicio
 *     downstream para que pueda validarlo nuevamente (zero-trust).
 *   - Autorización por rol: para operaciones sensibles (gestión de usuarios,
 *     consulta de auditoría, mutaciones de catálogo) aplica un guard de
 *     rol Administrador / Operador antes de llegar al servicio.
 *   - Enrutamiento: prefijos /api/<dominio> proxean al microservicio
 *     correspondiente.
 *
 * Rutas expuestas:
 *   POST  /api/auth/login            público (límite de fallos por IP) → MS-01 auth-service
 *   POST  /api/auth/logout           JWT               → MS-01 auth-service
 *   POST  /api/auth/refresh          público           → MS-01 auth-service
 *   GET   /api/auth/verify           JWT               → MS-01 auth-service
 *
 *   GET   /api/users                 JWT + Admin       → MS-02 user-service
 *   POST  /api/users                 JWT + Admin       → MS-02 user-service
 *   GET   /api/users/:id             JWT + Admin       → MS-02 user-service
 *   PUT   /api/users/:id             JWT + Admin       → MS-02 user-service
 *   DELETE /api/users/:id            JWT + Admin       → MS-02 user-service
 *   POST  /api/users/:id/desbloquear JWT + Admin       → MS-02 user-service
 *
 *   GET   /api/categories            JWT + Admin/Op    → MS-03 category-service
 *   POST  /api/categories            JWT + Admin       → MS-03 category-service
 *   PUT   /api/categories/:id        JWT + Admin       → MS-03 category-service
 *   DELETE /api/categories/:id       JWT + Admin       → MS-03 category-service
 *
 *   GET   /api/products              JWT + Admin/Op    → MS-04 product-service
 *   GET   /api/products/:id          JWT + Admin/Op    → MS-04 product-service
 *   POST  /api/products              JWT + Admin       → MS-04 product-service
 *   PUT   /api/products/:id          JWT + Admin       → MS-04 product-service
 *   DELETE /api/products/:id         JWT + Admin       → MS-04 product-service
 *
 *   GET   /api/inventory/alerts      JWT + Admin/Op    → MS-05 inventory-service (MS-06 feature)
 *   GET   /api/inventory/movements   JWT + Admin/Op    → MS-05 inventory-service
 *   POST  /api/inventory/movements   JWT + Admin/Op    → MS-05 inventory-service
 *
 *   GET   /api/audit/logs            JWT + Admin       → MS-09 audit-service
 *
 *   GET   /api/barcodes/:code        JWT + Admin/Op    → MS-08 barcode-service
 *   POST  /api/barcodes/validate     JWT + Admin/Op    → MS-08 barcode-service
 *   POST  /api/barcodes/generate     JWT + Admin       → MS-08 barcode-service
 *
 *   GET   /api/config                JWT + Admin/Op    → MS-11 config-service
 *   GET   /api/config/:key           JWT + Admin/Op    → MS-11 config-service
 *   PUT   /api/config/:key           JWT + Admin       → MS-11 config-service
 *
 *   GET   /api/suppliers             JWT               → MS-10 supplier-service (placeholder)
 *
 *   GET   /api/protected/ping        JWT               → smoke test del gateway
 *
 * Eventos hacia MS-09 (auditoría):
 *   No los enruta el gateway directamente. Son webhooks server-to-server que
 *   cada servicio dispara cuando completa una acción auditable:
 *     - MS-01 auth-service        → login_exitoso, login_fallido, logout
 *     - MS-02 user-service        → crear_usuario, actualizar_usuario, etc.
 *     - MS-05 inventory-service   → registrar_movimiento, registrar_ajuste
 *   Se configuran vía MS09_AUDIT_WEBHOOK_URL / MS09_MOVEMENT_WEBHOOK_URL en
 *   docker-compose.yml.
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { createServicesConfig } = require('./config/services');
const { createAuthMiddleware } = require('./middlewares/auth.middleware');

const { createAuthRoutes } = require('./routes/auth.routes');
const { createLoginRateLimiter } = require('./middlewares/login-rate-limit.middleware');
const { createUserRoutes } = require('./routes/user.routes');
const { createCategoryRoutes } = require('./routes/category.routes');
const { createProductRoutes } = require('./routes/product.routes');
const { createProviderRoutes } = require('./routes/provider.routes');
const { createInventoryRouter } = require('./routes/inventory.routes');
const { createAuditRoutes } = require('./routes/audit.routes');
const { createExportRoutes } = require('./routes/export.routes');
const { createConfigRoutes } = require('./routes/config.routes');
const { createBarcodeRoutes } = require('./routes/barcode.routes');
const { createSupplierRoutes } = require('./routes/supplier.routes');

function createApp(options = {}) {
  const config = createServicesConfig(options);
  const fetchImpl = options.fetchImpl || fetch;

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'API Gateway TIENDATA activo 🚀' });
  });

  const authMiddleware =
    options.authMiddleware ||
    createAuthMiddleware({
      authServiceUrl: config.authServiceUrl,
      fetchImpl,
    });

  // Límite de intentos de login fallidos por IP (configurable por entorno)
  const loginRateLimiter =
    options.loginRateLimiter ||
    createLoginRateLimiter({
      maxFailures: Number(process.env.LOGIN_MAX_FALLOS_POR_IP) || 20,
      windowMs: (Number(process.env.LOGIN_VENTANA_MINUTOS) || 15) * 60 * 1000,
    });

  app.use(
    '/api/auth',
    createAuthRoutes({
      authServiceUrl: config.authServiceUrl,
      fetchImpl,
      loginRateLimiter: loginRateLimiter.middleware || loginRateLimiter,
    })
  );

  app.use(
    '/api/users',
    createUserRoutes({
      userServiceUrl: config.userServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/categories',
    createCategoryRoutes({
      categoryServiceUrl: config.categoryServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/products',
    createProductRoutes({
      productServiceUrl: config.productServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/providers',
    createProviderRoutes({
      providerServiceUrl: config.providerServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/inventory',
    createInventoryRouter({
      inventoryServiceUrl: config.inventoryServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/audit',
    createAuditRoutes({
      auditServiceUrl: config.auditServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/export',
    createExportRoutes({
      exportServiceUrl: config.exportServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/config',
    createConfigRoutes({
      configServiceUrl: config.configServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/barcodes',
    createBarcodeRoutes({
      barcodeServiceUrl: config.barcodeServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.use(
    '/api/suppliers',
    createSupplierRoutes({
      supplierServiceUrl: config.supplierServiceUrl,
      authMiddleware,
      fetchImpl,
    })
  );

  app.get('/api/protected/ping', authMiddleware, (req, res) => {
    res.json({
      success: true,
      data: {
        message: 'Acceso autorizado',
        usuario: req.authUser,
      },
    });
  });

  app.use((err, _req, res, _next) => {
    res.status(err.status || 500).json({
      success: false,
      error: {
        code: err.code || 'INTERNAL_ERROR',
        message: err.message || 'Error interno del servidor',
      },
    });
  });

  return app;
}

module.exports = {
  createApp,
};
