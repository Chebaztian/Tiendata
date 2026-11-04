const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const { createApp: createAuditApp } = require('../../services/audit-service/src/app');
const {
  InMemoryAuditRepository,
} = require('../../services/audit-service/src/repositories/audit.repository');
const { createApp: createAuthApp } = require('../../services/auth-service/src/app');
const {
  createApp: createCategoryApp,
  InMemoryCategoryRepository,
} = require('../../services/category-service/src/app');
const { createApp: createInventoryApp } = require('../../services/inventory-service/src/app');
const {
  InMemoryInventoryRepository,
} = require('../../services/inventory-service/src/repositories/inventory.repository');
const { createApp: createProductApp } = require('../../services/product-service/src/app');
const {
  InMemoryProductRepository,
} = require('../../services/product-service/src/repositories/product.repository');
const { createApp: createUserApp } = require('../../services/user-service/src/app');
const {
  InMemoryUserRepository,
} = require('../../services/user-service/src/repositories/user.repository');
const { createApp: createGatewayApp } = require('../src/app');

async function startServer(app) {
  if (app.ready) {
    await app.ready;
  }

  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

async function stopServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        return reject(error);
      }

      return resolve();
    });
  });
}

function createSeedUsers() {
  return [
    {
      id_usuario: 1,
      nombre_usuario: 'admin',
      nombre: 'Administrador Demo',
      rol: 'Administrador',
      estado: 'activo',
      contrasena_hash: bcrypt.hashSync('Admin1234', 10),
      intentos_fallidos: 0,
      bloqueo_hasta: null,
    },
    {
      id_usuario: 2,
      nombre_usuario: 'operador',
      nombre: 'Operador Demo',
      rol: 'Operador',
      estado: 'activo',
      contrasena_hash: bcrypt.hashSync('Operador123', 10),
      intentos_fallidos: 0,
      bloqueo_hasta: null,
    },
  ];
}

async function waitForAuditLogCount(gatewayApp, token, expectedTotal) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await request(gatewayApp)
      .get('/api/audit/logs?page=1&size=20')
      .set('Authorization', `Bearer ${token}`);

    if (response.status === 200 && response.body?.data?.total >= expectedTotal) {
      return response;
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error(`No se alcanzaron ${expectedTotal} logs de auditoria a tiempo`);
}

test('Gateway integra login, users, categories, products, inventory y audit logs', async () => {
  const auditApp = createAuditApp({
    repository: new InMemoryAuditRepository(),
    authMiddleware: (req, _res, next) => {
      req.authUser = {
        id_usuario: 1,
        nombre: 'Administrador Demo',
        rol: 'Administrador',
      };
      next();
    },
  });
  const auditServer = await startServer(auditApp);
  const auditPort = auditServer.address().port;

  const authApp = createAuthApp({
    seedUsers: createSeedUsers(),
    ms09AuditWebhookUrl: `http://127.0.0.1:${auditPort}/api/audit/events`,
    serviceOptions: {
      jwtSecret: 'test-secret',
    },
  });

  const userApp = createUserApp({
    repository: new InMemoryUserRepository({
      users: [
        {
          id_usuario: 1,
          id_rol: 1,
          nombre: 'Administrador Demo',
          correo: 'admin@tiendata.test',
          contrasena: bcrypt.hashSync('Admin1234', 10),
          estado: true,
          fecha_creacion: new Date().toISOString(),
          ultimo_acceso: null,
          intentos_fallidos: 0,
          bloqueado: false,
        },
      ],
    }),
    ms09AuditWebhookUrl: `http://127.0.0.1:${auditPort}/api/audit/events`,
    serviceOptions: {
      bcryptSaltRounds: 4,
    },
  });

  const categoryApp = createCategoryApp({
    repository: new InMemoryCategoryRepository({
      categories: [
        {
          id_categoria: 1,
          nombre_categoria: 'Bebidas',
          descripcion: 'Productos frios',
          estado: true,
        },
      ],
      products: [],
    }),
  });

  const productApp = createProductApp({
    repository: new InMemoryProductRepository({
      categories: [
        {
          id_categoria: 1,
          nombre_categoria: 'Bebidas',
          estado: true,
        },
      ],
      products: [],
    }),
  });

  const authServer = await startServer(authApp);
  const userServer = await startServer(userApp);
  const categoryServer = await startServer(categoryApp);
  const productServer = await startServer(productApp);

  const authPort = authServer.address().port;
  const userPort = userServer.address().port;
  const categoryPort = categoryServer.address().port;
  const productPort = productServer.address().port;

  const inventoryApp = createInventoryApp({
    repository: new InMemoryInventoryRepository({
      products: [
        {
          id_producto: 1,
          nombre: 'Agua Mineral 500ml',
          stock_actual: 10,
          estado: true,
        },
      ],
      movements: [],
    }),
    authServiceUrl: `http://127.0.0.1:${authPort}`,
    ms09MovementWebhookUrl: `http://127.0.0.1:${auditPort}/api/audit/events`,
    notifier: undefined,
  });
  const inventoryServer = await startServer(inventoryApp);
  const inventoryPort = inventoryServer.address().port;

  const gatewayApp = createGatewayApp({
    authServiceUrl: `http://127.0.0.1:${authPort}`,
    userServiceUrl: `http://127.0.0.1:${userPort}`,
    categoryServiceUrl: `http://127.0.0.1:${categoryPort}`,
    productServiceUrl: `http://127.0.0.1:${productPort}`,
    inventoryServiceUrl: `http://127.0.0.1:${inventoryPort}`,
    auditServiceUrl: `http://127.0.0.1:${auditPort}`,
  });

  const failedLogin = await request(gatewayApp).post('/api/auth/login').send({
    nombre_usuario: 'admin',
    contrasena: 'incorrecta',
  });
  assert.equal(failedLogin.status, 401);

  const adminLogin = await request(gatewayApp).post('/api/auth/login').send({
    nombre_usuario: 'admin',
    contrasena: 'Admin1234',
  });

  assert.equal(adminLogin.status, 200);
  const adminToken = adminLogin.body.data.token;

  const operatorLogin = await request(gatewayApp).post('/api/auth/login').send({
    nombre_usuario: 'operador',
    contrasena: 'Operador123',
  });

  assert.equal(operatorLogin.status, 200);
  const operatorToken = operatorLogin.body.data.token;

  const createUserResponse = await request(gatewayApp)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      nombre: 'Nuevo Usuario',
      correo: 'nuevo@tiendata.test',
      contrasena: 'ClaveSegura123',
      id_rol: 2,
    });

  assert.equal(createUserResponse.status, 201);
  assert.equal(createUserResponse.body.success, true);

  const createCategoryResponse = await request(gatewayApp)
    .post('/api/categories')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      nombre_categoria: 'Lacteos',
      descripcion: 'Cadena de frio',
    });

  assert.equal(createCategoryResponse.status, 201);
  assert.equal(createCategoryResponse.body.success, true);

  const createProductResponse = await request(gatewayApp)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      nombre: 'Agua Mineral 500ml',
      codigo_barras: '7501234567890',
      id_categoria: 1,
      precio_compra: 10,
      precio_venta: 15,
      stock_inicial: 10,
      stock_minimo: 2,
      ubicacion: 'Pasillo 1',
    });

  assert.equal(createProductResponse.status, 201);
  assert.equal(createProductResponse.body.success, true);
  assert.equal(createProductResponse.body.data.id_producto, 1);

  const listProductsResponse = await request(gatewayApp)
    .get('/api/products?page=1&size=10')
    .set('Authorization', `Bearer ${operatorToken}`);

  assert.equal(listProductsResponse.status, 200);
  assert.equal(listProductsResponse.body.data.productos.length, 1);

  const registerMovementResponse = await request(gatewayApp)
    .post('/api/inventory/movements')
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({
      id_producto: 1,
      tipo_movimiento: 'entrada',
      cantidad: 5,
      numero_factura: 'FAC-001',
      comentario: 'Ingreso por compra',
    });

  assert.equal(registerMovementResponse.status, 201);
  assert.equal(registerMovementResponse.body.success, true);
  assert.equal(registerMovementResponse.body.data.nuevo_stock, 15);

  const listMovementsResponse = await request(gatewayApp)
    .get('/api/inventory/movements?producto=1&tipo=entrada')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(listMovementsResponse.status, 200);
  assert.equal(listMovementsResponse.body.success, true);
  assert.equal(listMovementsResponse.body.data.total, 1);

  const reportsResponse = await request(gatewayApp)
    .get('/api/inventory/reports/stock')
    .set('Authorization', `Bearer ${operatorToken}`);

  assert.equal(reportsResponse.status, 200);
  assert.equal(reportsResponse.body.success, true);
  assert.equal(reportsResponse.body.data.meta.reportType, 'stock');
  assert.ok(Array.isArray(reportsResponse.body.data.items));

  const auditLogsResponse = await waitForAuditLogCount(gatewayApp, adminToken, 4);
  assert.equal(auditLogsResponse.status, 200);
  assert.equal(auditLogsResponse.body.success, true);

  const actions = auditLogsResponse.body.data.logs.map((item) => item.accion);
  assert.ok(actions.includes('login_fallido'));
  assert.ok(actions.includes('login_exitoso'));
  assert.ok(actions.includes('crear_usuario'));
  assert.ok(actions.includes('registrar_movimiento'));

  const inventoryLog = auditLogsResponse.body.data.logs.find(
    (item) => item.accion === 'registrar_movimiento'
  );
  assert.equal(inventoryLog.modulo, 'inventario');
  assert.equal(inventoryLog.datos_nuevos.stock_actual, 15);

  const filteredAuditLogs = await request(gatewayApp)
    .get('/api/audit/logs?modulo=usuarios')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(filteredAuditLogs.status, 200);
  assert.equal(filteredAuditLogs.body.data.logs.every((item) => item.modulo === 'usuarios'), true);

  const forbiddenAuditLogs = await request(gatewayApp)
    .get('/api/audit/logs')
    .set('Authorization', `Bearer ${operatorToken}`);

  assert.equal(forbiddenAuditLogs.status, 403);
  assert.equal(forbiddenAuditLogs.body.error.code, 'AUTH_FORBIDDEN');

  const forbiddenProductCreate = await request(gatewayApp)
    .post('/api/products')
    .set('Authorization', `Bearer ${operatorToken}`)
    .send({
      nombre: 'Producto no permitido',
      codigo_barras: '7501234567899',
      id_categoria: 1,
      precio_compra: 10,
      precio_venta: 12,
      stock_inicial: 1,
    });

  assert.equal(forbiddenProductCreate.status, 403);
  assert.equal(forbiddenProductCreate.body.error.code, 'AUTH_FORBIDDEN');

  await stopServer(inventoryServer);
  await stopServer(productServer);
  await stopServer(categoryServer);
  await stopServer(userServer);
  await stopServer(authServer);
  await stopServer(auditServer);
});
