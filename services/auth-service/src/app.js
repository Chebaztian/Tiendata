const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const { buildServiceConfig } = require('./config/services');
const { pool } = require('./config/db');
const { InMemoryAuthRepository } = require('./repositories/auth.repository');
const { PgAuthRepository } = require('./repositories/pg.auth.repository');
const { AuthController } = require('./controllers/auth.controller');
const { createAuthRoutes } = require('./routes/auth.routes');
const { AuthAuditNotifier } = require('./services/auth-audit-notifier.service');
const { AuthService } = require('./services/auth.service');

function createDefaultUser() {
  return {
    id_usuario: 1,
    nombre_usuario: process.env.DEMO_USER_USERNAME || 'admin',
    correo: process.env.DEMO_USER_EMAIL || process.env.DEMO_USER_USERNAME || 'admin@tiendata.com',
    nombre: process.env.DEMO_USER_NAME || 'Administrador Demo',
    rol: process.env.DEMO_USER_ROLE || 'Administrador',
    estado: 'activo',
    contrasena_hash: bcrypt.hashSync(process.env.DEMO_USER_PASSWORD || 'Admin1234', 10),
    intentos_fallidos: 0,
    bloqueo_hasta: null,
  };
}

function buildRepository(options) {
  if (options.repository) return options.repository;
  if (options.seedUsers) return new InMemoryAuthRepository({ users: options.seedUsers });
  if (process.env.DB_HOST) return new PgAuthRepository({ pool: options.pool || pool });
  return new InMemoryAuthRepository({ users: [createDefaultUser()] });
}

function createApp(options = {}) {
  const app = express();
  const config = buildServiceConfig(options);
  const fetchImpl = options.fetchImpl || fetch;
  const repository = buildRepository(options);
  const auditNotifier =
    options.auditNotifier ||
    new AuthAuditNotifier({
      auditWebhookUrl: config.ms09AuditWebhookUrl,
      fetchImpl,
    });

  const service =
    options.service ||
    new AuthService({
      repository,
      auditNotifier,
      jwtSecret:
        options.serviceOptions?.jwtSecret || process.env.JWT_SECRET || 'change-me-in-production',
      jwtExpiresIn:
        options.serviceOptions?.jwtExpiresIn || process.env.JWT_EXPIRES_IN || '30m',
      maxLoginAttempts:
        options.serviceOptions?.maxLoginAttempts || Number(process.env.MAX_LOGIN_ATTEMPTS || 3),
      lockMinutes:
        options.serviceOptions?.lockMinutes || Number(process.env.LOCK_TIME_MINUTES || 15),
    });

  const controller = options.controller || new AuthController(service);

  app.use(cors());
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ success: true, message: 'Auth Service activo' });
  });

  app.use('/api/auth', createAuthRoutes(controller));

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

module.exports = { createApp };
