const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const bcrypt = require('bcryptjs');

const { createApp } = require('../src/app');
const { InMemoryUserRepository } = require('../src/repositories/user.repository');

function buildTestContext() {
  const repository = new InMemoryUserRepository({
    users: [
      {
        id_usuario: 1,
        id_rol: 1,
        nombre: 'Admin Principal',
        correo: 'admin@stocker.test',
        contrasena: bcrypt.hashSync('Admin1234', 10),
        estado: true,
        fecha_creacion: new Date().toISOString(),
        ultimo_acceso: null,
        intentos_fallidos: 0,
        bloqueado: false,
      },
      {
        id_usuario: 2,
        id_rol: 2,
        nombre: 'Usuario Operativo',
        correo: 'operativo@stocker.test',
        contrasena: bcrypt.hashSync('Operativo123', 10),
        estado: true,
        fecha_creacion: new Date().toISOString(),
        ultimo_acceso: null,
        intentos_fallidos: 0,
        bloqueado: false,
      },
      {
        id_usuario: 3,
        id_rol: 2,
        nombre: 'Usuario Inactivo',
        correo: 'inactivo@stocker.test',
        contrasena: bcrypt.hashSync('Inactivo123', 10),
        estado: false,
        fecha_creacion: new Date().toISOString(),
        ultimo_acceso: null,
        intentos_fallidos: 0,
        bloqueado: false,
      },
    ],
  });

  const app = createApp({
    repository,
    serviceOptions: {
      bcryptSaltRounds: 4,
    },
  });

  return { app, repository };
}

test('POST /api/users crea usuario con hash bcrypt sin exponer contraseña', async () => {
  const { app, repository } = buildTestContext();

  const response = await request(app).post('/api/users').send({
    nombre: 'Nuevo Usuario',
    correo: 'nuevo@stocker.test',
    contrasena: 'ClaveSegura123',
    id_rol: 2,
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.correo, 'nuevo@stocker.test');
  assert.equal(response.body.data.contrasena, undefined);

  const created = await repository.getRawById(response.body.data.id_usuario);
  assert.notEqual(created.contrasena, 'ClaveSegura123');
  assert.equal(await bcrypt.compare('ClaveSegura123', created.contrasena), true);
});

test('GET /api/users pagina y filtra por estado', async () => {
  const { app } = buildTestContext();

  const response = await request(app).get('/api/users?page=1&size=2&estado=activo');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.total, 2);
  assert.equal(response.body.data.items.length, 2);
  assert.equal(response.body.data.items.every((item) => item.estado === true), true);
});

test('PUT /api/users/:id actualiza parcialmente campos opcionales', async () => {
  const { app } = buildTestContext();

  const response = await request(app).put('/api/users/2').send({
    nombre: 'Usuario Operativo Editado',
    estado: 'inactivo',
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.id_usuario, 2);
  assert.equal(response.body.data.nombre, 'Usuario Operativo Editado');
  assert.equal(response.body.data.estado, false);
});

test('DELETE /api/users/:id realiza borrado lógico', async () => {
  const { app } = buildTestContext();

  const response = await request(app)
    .delete('/api/users/2')
    .set('x-user-id', '1')
    .set('x-user-role', 'Administrador');

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.estado, false);
});

test('regla de negocio: admin no puede deshabilitarse a sí mismo', async () => {
  const { app } = buildTestContext();

  const response = await request(app)
    .put('/api/users/1')
    .set('x-user-id', '1')
    .set('x-user-role', 'Administrador')
    .send({ estado: false });

  assert.equal(response.status, 409);
  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, 'ADMIN_SELF_DISABLE_FORBIDDEN');
});

test('GET /api/users responde por debajo de 1000ms en escenario local', async () => {
  const { app } = buildTestContext();

  const start = performance.now();
  const response = await request(app).get('/api/users?page=1&size=10');
  const elapsedMs = performance.now() - start;

  assert.equal(response.status, 200);
  assert.equal(elapsedMs < 1000, true);
});

// ── Desbloqueo de cuentas por el administrador (MS-01) ──────────────────────

test('GET /api/users indica si el bloqueo está vigente', async () => {
  const { app, repository } = buildTestContext();
  await repository.updateUserPartial(2, {
    bloqueado: true,
    bloqueo_hasta: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  await repository.updateUserPartial(3, {
    bloqueado: true,
    bloqueo_hasta: new Date(Date.now() - 60 * 1000).toISOString(),
  });

  const response = await request(app).get('/api/users?page=1&size=10');
  assert.equal(response.status, 200);
  const byId = Object.fromEntries(response.body.data.items.map((u) => [u.id_usuario, u]));
  assert.equal(byId[1].bloqueo_vigente, false);
  assert.equal(byId[2].bloqueo_vigente, true);
  assert.equal(byId[3].bloqueo_vigente, false, 'un bloqueo vencido no cuenta como vigente');
});

test('POST /api/users/:id/desbloquear libera la cuenta y reinicia intentos', async () => {
  const { app, repository } = buildTestContext();
  await repository.updateUserPartial(2, {
    bloqueado: true,
    bloqueo_hasta: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    intentos_fallidos: 2,
  });

  const response = await request(app)
    .post('/api/users/2/desbloquear')
    .set('x-user-id', '1')
    .set('x-user-role', 'Administrador');

  assert.equal(response.status, 200);
  assert.equal(response.body.data.bloqueado, false);
  assert.equal(response.body.data.bloqueo_vigente, false);
  assert.equal(response.body.data.contrasena, undefined);

  const raw = await repository.getRawById(2);
  assert.equal(raw.bloqueado, false);
  assert.equal(raw.bloqueo_hasta, null);
  assert.equal(raw.intentos_fallidos, 0);
});

test('POST /api/users/:id/desbloquear devuelve 404 si el usuario no existe', async () => {
  const { app } = buildTestContext();
  const response = await request(app).post('/api/users/999/desbloquear');
  assert.equal(response.status, 404);
});
