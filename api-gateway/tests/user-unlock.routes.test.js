'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const { createUserRoutes } = require('../src/routes/user.routes');

function buildApp(fetchImpl, user) {
  const app = express();
  app.use(express.json());
  app.use(
    '/api/users',
    createUserRoutes({
      userServiceUrl: 'http://user-service:3004',
      authMiddleware: (req, _res, next) => {
        req.authUser = user;
        next();
      },
      fetchImpl,
    })
  );
  return app;
}

function okUpstream(calls) {
  return async (url, options) => {
    calls.push({ url: url.toString(), options });
    return {
      status: 200,
      async json() {
        return { success: true, data: { id_usuario: 7, bloqueado: false } };
      },
    };
  };
}

test('POST /api/users/:id/desbloquear reenvía al user-service con el actor', async () => {
  const calls = [];
  const app = buildApp(okUpstream(calls), { id_usuario: 1, nombre: 'Admin', rol: 'Administrador' });

  const response = await request(app).post('/api/users/7/desbloquear');

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/api\/users\/7\/desbloquear$/);
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers['x-user-id'], '1');
});

test('POST /api/users/:id/desbloquear está prohibido para Operador', async () => {
  const calls = [];
  const app = buildApp(okUpstream(calls), { id_usuario: 2, nombre: 'Op', rol: 'Operador' });

  const response = await request(app).post('/api/users/7/desbloquear');

  assert.equal(response.status, 403);
  assert.equal(calls.length, 0);
});
