'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

const { createLoginRateLimiter } = require('../src/middlewares/login-rate-limit.middleware');

function buildApp(limiter, statusFor) {
  const app = express();
  app.use(express.json());
  app.post('/login', limiter.middleware, (req, res) => {
    const status = statusFor(req.body);
    res.status(status).json({ success: status === 200 });
  });
  return app;
}

const byPassword = (body) => (body.contrasena === 'ok' ? 200 : 401);

test('bloquea la IP tras el máximo de intentos fallidos con 429 y Retry-After', async () => {
  const limiter = createLoginRateLimiter({ maxFailures: 3, windowMs: 60_000 });
  const app = buildApp(limiter, byPassword);

  for (let i = 0; i < 3; i += 1) {
    const response = await request(app).post('/login').send({ contrasena: 'mal' });
    assert.equal(response.status, 401);
  }

  const blocked = await request(app).post('/login').send({ contrasena: 'ok' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.error.code, 'AUTH_TOO_MANY_ATTEMPTS');
  assert.ok(Number(blocked.headers['retry-after']) > 0);
  limiter.stop();
});

test('los logins exitosos no consumen el cupo', async () => {
  const limiter = createLoginRateLimiter({ maxFailures: 2, windowMs: 60_000 });
  const app = buildApp(limiter, byPassword);

  for (let i = 0; i < 5; i += 1) {
    const response = await request(app).post('/login').send({ contrasena: 'ok' });
    assert.equal(response.status, 200);
  }
  limiter.stop();
});

test('los fallos vencen al terminar la ventana', async () => {
  let clock = 1_000_000;
  const limiter = createLoginRateLimiter({ maxFailures: 2, windowMs: 60_000, now: () => clock });
  const app = buildApp(limiter, byPassword);

  await request(app).post('/login').send({ contrasena: 'mal' });
  await request(app).post('/login').send({ contrasena: 'mal' });
  assert.equal((await request(app).post('/login').send({ contrasena: 'ok' })).status, 429);

  clock += 60_001;
  assert.equal((await request(app).post('/login').send({ contrasena: 'ok' })).status, 200);
  limiter.stop();
});

test('cuenta también los 423 (cuenta bloqueada) y no los 400', async () => {
  const limiter = createLoginRateLimiter({ maxFailures: 2, windowMs: 60_000 });
  const app = buildApp(limiter, (body) => body.status);

  await request(app).post('/login').send({ status: 400 });
  await request(app).post('/login').send({ status: 400 });
  assert.equal((await request(app).post('/login').send({ status: 423 })).status, 423);
  assert.equal((await request(app).post('/login').send({ status: 423 })).status, 423);
  assert.equal((await request(app).post('/login').send({ status: 200 })).status, 429);
  limiter.stop();
});
