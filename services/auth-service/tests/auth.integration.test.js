const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const { createApp } = require('../src/app');

function createTestApp() {
  const seedUsers = [
    {
      id_usuario: 10,
      nombre_usuario: 'qa_admin',
      nombre: 'QA Admin',
      rol: 'Administrador',
      estado: 'activo',
      contrasena_hash: bcrypt.hashSync('Admin1234', 10),
      intentos_fallidos: 0,
      bloqueo_hasta: null,
    },
  ];

  return createApp({
    seedUsers,
    service: undefined,
    serviceOptions: {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '30m',
      maxLoginAttempts: 3,
      lockMinutes: 15,
    },
  });
}

test('POST /api/auth/login devuelve token con credenciales válidas', async () => {
  const app = createTestApp();

  const response = await request(app).post('/api/auth/login').send({
    nombre_usuario: 'qa_admin',
    contrasena: 'Admin1234',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.ok(response.body.data.token);
  assert.equal(response.body.data.rol, 'Administrador');
});

test('POST /api/auth/login bloquea cuenta tras 3 intentos fallidos', async () => {
  const app = createTestApp();

  for (let i = 0; i < 2; i += 1) {
    const response = await request(app).post('/api/auth/login').send({
      nombre_usuario: 'qa_admin',
      contrasena: 'incorrecta',
    });
    assert.equal(response.status, 401);
  }

  const thirdAttempt = await request(app).post('/api/auth/login').send({
    nombre_usuario: 'qa_admin',
    contrasena: 'incorrecta',
  });

  assert.equal(thirdAttempt.status, 423);
  assert.equal(thirdAttempt.body.error.code, 'AUTH_ACCOUNT_BLOCKED');
});

test('GET /api/auth/verify valida token emitido', async () => {
  const app = createTestApp();

  const login = await request(app).post('/api/auth/login').send({
    nombre_usuario: 'qa_admin',
    contrasena: 'Admin1234',
  });

  const verify = await request(app)
    .get('/api/auth/verify')
    .set('Authorization', `Bearer ${login.body.data.token}`);

  assert.equal(verify.status, 200);
  assert.equal(verify.body.data.valid, true);
  assert.equal(verify.body.data.id_usuario, 10);
});

test('POST /api/auth/logout revoca token y verify devuelve 401', async () => {
  const app = createTestApp();

  const login = await request(app).post('/api/auth/login').send({
    nombre_usuario: 'qa_admin',
    contrasena: 'Admin1234',
  });

  const token = login.body.data.token;

  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(logout.status, 200);

  const verifyAfterLogout = await request(app)
    .get('/api/auth/verify')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(verifyAfterLogout.status, 401);
  assert.equal(verifyAfterLogout.body.error.code, 'AUTH_TOKEN_REVOKED');
});

test('POST /api/auth/refresh devuelve nuevo token e invalida token previo', async () => {
  const app = createTestApp();

  const login = await request(app).post('/api/auth/login').send({
    nombre_usuario: 'qa_admin',
    contrasena: 'Admin1234',
  });

  const oldToken = login.body.data.token;

  const refresh = await request(app)
    .post('/api/auth/refresh')
    .set('Authorization', `Bearer ${oldToken}`);

  assert.equal(refresh.status, 200);
  assert.ok(refresh.body.data.token);
  assert.notEqual(refresh.body.data.token, oldToken);

  const oldTokenVerify = await request(app)
    .get('/api/auth/verify')
    .set('Authorization', `Bearer ${oldToken}`);

  assert.equal(oldTokenVerify.status, 401);
  assert.equal(oldTokenVerify.body.error.code, 'AUTH_TOKEN_REVOKED');
});

// ── Mejoras MS-01: identificador, bloqueo, cuenta inactiva, logout ──────────

function createAppWithUsers(users, serviceOptions = {}) {
  return createApp({
    seedUsers: users,
    serviceOptions: {
      jwtSecret: 'test-secret',
      jwtExpiresIn: '30m',
      maxLoginAttempts: 3,
      lockMinutes: 15,
      ...serviceOptions,
    },
  });
}

function seedUser(overrides = {}) {
  return {
    id_usuario: 20,
    nombre_usuario: 'operador1',
    correo: 'operador1@tiendata.com',
    nombre: 'Operador Uno',
    rol: 'Operador',
    estado: 'activo',
    contrasena_hash: bcrypt.hashSync('Clave1234', 4),
    ...overrides,
  };
}

test('login acepta correo o nombre de usuario sin distinguir mayúsculas', async () => {
  const app = createAppWithUsers([seedUser()]);

  const byEmail = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'Operador1@Tiendata.com', contrasena: 'Clave1234' });
  assert.equal(byEmail.status, 200);

  const byUsername = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'OPERADOR1', contrasena: 'Clave1234' });
  assert.equal(byUsername.status, 200);

  const legacyField = await request(app)
    .post('/api/auth/login')
    .send({ correo: 'operador1@tiendata.com', contrasena: 'Clave1234' });
  assert.equal(legacyField.status, 200);
});

test('login sin identificador o contraseña responde 400', async () => {
  const app = createAppWithUsers([seedUser()]);
  const response = await request(app).post('/api/auth/login').send({ identificador: '  ' });
  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, 'VALIDATION_ERROR');
});

test('login fallido informa intentos restantes', async () => {
  const app = createAppWithUsers([seedUser()]);
  const response = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'operador1', contrasena: 'mala' });
  assert.equal(response.status, 401);
  assert.equal(response.body.error.details.intentos_restantes, 2);
});

test('cuenta bloqueada informa los minutos restantes reales', async () => {
  const app = createAppWithUsers([
    seedUser({ bloqueo_hasta: Date.now() + 4 * 60 * 1000 + 10 * 1000 }),
  ]);
  const response = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'operador1', contrasena: 'Clave1234' });
  assert.equal(response.status, 423);
  assert.match(response.body.error.message, /5 minutos/);
  assert.ok(response.body.error.details.reintentar_en_segundos > 0);
});

test('cuenta con bloqueo vencido puede iniciar sesión', async () => {
  const app = createAppWithUsers([seedUser({ bloqueo_hasta: Date.now() - 1000 })]);
  const response = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'operador1', contrasena: 'Clave1234' });
  assert.equal(response.status, 200);
});

test('cuenta inactiva: 403 solo con contraseña correcta, 401 sin acumular intentos si es incorrecta', async () => {
  const app = createAppWithUsers([seedUser({ estado: 'inactivo' })]);

  for (let i = 0; i < 4; i += 1) {
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ identificador: 'operador1', contrasena: 'mala' });
    assert.equal(wrong.status, 401);
  }

  const right = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'operador1', contrasena: 'Clave1234' });
  assert.equal(right.status, 403);
  assert.equal(right.body.error.code, 'AUTH_ACCOUNT_DISABLED');
});

test('logout rechaza tokens con firma inválida', async () => {
  const jwt = require('jsonwebtoken');
  const app = createAppWithUsers([seedUser()]);
  const forged = jwt.sign({ id_usuario: 20, jti: 'x' }, 'otro-secreto', { expiresIn: '5m' });

  const response = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${forged}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'AUTH_TOKEN_INVALID');
});

test('verify distingue token expirado', async () => {
  const jwt = require('jsonwebtoken');
  const app = createAppWithUsers([seedUser()]);
  const expired = jwt.sign(
    { id_usuario: 20, jti: 'y', exp: Math.floor(Date.now() / 1000) - 10 },
    'test-secret'
  );

  const response = await request(app)
    .get('/api/auth/verify')
    .set('Authorization', `Bearer ${expired}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.error.code, 'AUTH_TOKEN_EXPIRED');

  const logout = await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${expired}`);
  assert.equal(logout.status, 200);
});

test('logout notifica a auditoría', async () => {
  const events = [];
  const app = createApp({
    seedUsers: [seedUser()],
    auditNotifier: {
      notifyLoginSuccess: async (e) => events.push(['login', e]),
      notifyLoginFailure: async () => {},
      notifyLogout: async (e) => events.push(['logout', e]),
    },
    serviceOptions: { jwtSecret: 'test-secret' },
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ identificador: 'operador1', contrasena: 'Clave1234' });
  await request(app)
    .post('/api/auth/logout')
    .set('Authorization', `Bearer ${login.body.data.token}`);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    events.map(([type]) => type),
    ['login', 'logout']
  );
  assert.equal(events[1][1].user.id_usuario, 20);
});
