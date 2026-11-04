const test = require('node:test');
const assert = require('node:assert/strict');

const { createApp } = require('../src/app');
const { InMemoryAuditRepository } = require('../src/repositories/audit.repository');

async function startServer(app) {
  await app.ready;
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function stopServer(server) {
  await new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
}

function createTestAuthMiddleware(user) {
  return (req, _res, next) => {
    req.authUser = user;
    next();
  };
}

test('POST /api/audit/events registra evento y GET /api/audit/logs filtra por usuario, fecha y modulo', async () => {
  const app = createApp({
    repository: new InMemoryAuditRepository(),
    authMiddleware: createTestAuthMiddleware({
      id_usuario: 1,
      nombre: 'Administrador Demo',
      rol: 'Administrador',
    }),
  });

  const server = await startServer(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const registerResponse = await fetch(`${baseUrl}/api/audit/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      action: 'crear_usuario',
      module: 'usuarios',
      entity: 'usuario',
      entityId: 15,
      user: {
        id_usuario: 1,
        nombre: 'Administrador Demo',
        rol: 'Administrador',
      },
      detail: {
        mensaje: 'Usuario creado exitosamente',
        origen: 'qa',
      },
      previousData: {
        estado: null,
      },
      newData: {
        estado: true,
        correo: 'nuevo@tiendata.test',
      },
      sessionId: 'session-test-001',
    }),
  });

  assert.equal(registerResponse.status, 201);
  const registered = await registerResponse.json();
  assert.equal(registered.data.accion, 'crear_usuario');
  assert.equal(registered.data.modulo, 'usuarios');
  assert.equal(registered.data.usuario.nombre, 'Administrador Demo');

  const today = new Date().toISOString().slice(0, 10);
  const listResponse = await fetch(
    `${baseUrl}/api/audit/logs?usuario=Administrador&modulo=usuarios&fecha=${today}`
  );
  assert.equal(listResponse.status, 200);

  const listed = await listResponse.json();
  assert.equal(listed.data.total, 1);
  assert.equal(listed.data.logs.length, 1);
  assert.equal(listed.data.logs[0].detalle.origen, 'qa');
  assert.equal(listed.data.logs[0].datos_nuevos.estado, true);

  await stopServer(server);
});

test('GET /api/audit/logs bloquea usuarios que no son administradores', async () => {
  const app = createApp({
    repository: new InMemoryAuditRepository(),
    authMiddleware: createTestAuthMiddleware({
      id_usuario: 2,
      nombre: 'Operador Demo',
      rol: 'Operador',
    }),
  });

  const server = await startServer(app);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const response = await fetch(`${baseUrl}/api/audit/logs`);
  assert.equal(response.status, 403);

  const body = await response.json();
  assert.equal(body.error.code, 'AUTH_FORBIDDEN');

  await stopServer(server);
});
