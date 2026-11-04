'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const request = require('supertest');
const ExcelJS = require('exceljs');

const { createApp } = require('../src/app');
const { MAX_EXPORT_RECORDS } = require('../src/services/export.service');

function createAuthMiddleware(user) {
  return (req, _res, next) => {
    req.authUser = user;
    next();
  };
}

function createTestApp({
  user = { id_usuario: 1, nombre: 'Admin Demo', rol: 'Administrador' },
  dataSources = {},
  fetchImpl,
} = {}) {
  return createApp({
    authMiddleware: createAuthMiddleware(user),
    exportDataSources: dataSources,
    exportTempDir: path.join(os.tmpdir(), `tiendata-export-test-${randomUUID()}`),
    exportNowProvider: () => '2026-05-04T12:00:00.000Z',
    fetchImpl,
  });
}

function binaryParser(res, callback) {
  const chunks = [];
  res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

test('POST /api/export genera CSV y excluye campos sensibles', async () => {
  const app = createTestApp({
    dataSources: {
      productos: [
        {
          id_producto: 1,
          nombre: 'Cafe Premium',
          precio_venta: 15000,
          contrasena_hash: 'no-debe-salir',
          session_token: 'token-secreto',
        },
      ],
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'productos', formato: 'CSV' });

  assert.equal(response.status, 200);
  assert.match(response.headers['content-disposition'], /productos_2026-05-04\.csv/);
  assert.match(response.text, /Cafe Premium/);
  assert.doesNotMatch(response.text, /contrasena_hash/);
  assert.doesNotMatch(response.text, /session_token/);
  assert.doesNotMatch(response.text, /no-debe-salir/);
});

test('POST /api/export genera PDF desde datos de movimientos', async () => {
  const app = createTestApp({
    dataSources: {
      movimientos: [
        {
          fecha: '2026-05-01',
          producto: 'Cafe Premium',
          tipo: 'entrada',
          cantidad: 8,
        },
      ],
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'movimientos', formato: 'PDF' })
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);
  assert.equal(response.body.slice(0, 4).toString('ascii'), '%PDF');
  assert.match(response.headers['content-disposition'], /movimientos_2026-05-04\.pdf/);
});

test('POST /api/export genera Excel con extension xlsx', async () => {
  const app = createTestApp({
    dataSources: {
      categorias: [
        {
          id_categoria: 10,
          nombre_categoria: 'Bebidas',
          estado: true,
        },
      ],
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'categorias', formato: 'EXCEL' })
    .buffer(true)
    .parse(binaryParser);

  assert.equal(response.status, 200);
  assert.equal(response.body.slice(0, 2).toString('ascii'), 'PK');
  assert.match(response.headers['content-disposition'], /categorias_2026-05-04\.xlsx/);
  assert.equal(response.headers['x-export-records'], '1');

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(response.body);
  assert.ok(workbook.getWorksheet('Resumen'));
  assert.ok(workbook.getWorksheet('Categorias'));
  assert.equal(workbook.getWorksheet('Resumen').getCell('A1').value, 'TIENDATA - Exportacion de datos');
  assert.equal(workbook.getWorksheet('Categorias').getCell('A1').value, 'Categorias');
  assert.equal(workbook.getWorksheet('Categorias').getCell('A4').value, 'ID categoria');
});

test('POST /api/export toma movimientos desde el reporte de MS-07', async () => {
  const calls = [];
  const app = createTestApp({
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        async json() {
          return {
            meta: { reportType: 'movements', generatedAt: '2026-05-04T00:00:00.000Z' },
            items: [
              {
                fecha: '2026-05-01',
                producto: 'Cafe Premium',
                cantidad: 8,
              },
            ],
          };
        },
      };
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({
      conjunto_datos: 'movimientos',
      report_type: 'movements',
      formato: 'CSV',
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-04',
      id_categoria: 3,
      id_producto: 9,
      tipo: 'entrada',
    });

  assert.equal(response.status, 200);
  assert.ok(calls.some((call) => /\/api\/inventory\/reports\/movements/.test(call.url)));
  assert.ok(calls.some((call) => /fecha_inicio=2026-05-01/.test(call.url)));
  assert.ok(calls.some((call) => /fecha_fin=2026-05-04/.test(call.url)));
  assert.ok(calls.some((call) => /categoria=3/.test(call.url)));
  assert.ok(calls.some((call) => /producto=9/.test(call.url)));
  assert.ok(calls.some((call) => /tipo=entrada/.test(call.url)));
  assert.ok(calls.some((call) => /\/api\/audit\/events/.test(call.url)));
  assert.match(response.text, /Cafe Premium/);
});

test('POST /api/export soporta ventas y stock desde reportes de MS-07 con filtros', async () => {
  const calls = [];
  const app = createTestApp({
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        async json() {
          return {
            data: {
              items: [
                {
                  producto: url.toString().includes('/stock') ? 'Cafe Stock' : 'Cafe Venta',
                  cantidad: 5,
                },
              ],
            },
          };
        },
      };
    },
  });

  const salesResponse = await request(app)
    .post('/api/export')
    .send({
      conjunto_datos: 'ventas',
      report_type: 'sales',
      formato: 'CSV',
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-04',
      id_categoria: 3,
      id_producto: 9,
    });

  const stockResponse = await request(app)
    .post('/api/export')
    .send({
      conjunto_datos: 'stock',
      report_type: 'stock',
      formato: 'CSV',
      id_categoria: 3,
      id_producto: 9,
    });

  assert.equal(salesResponse.status, 200);
  assert.equal(stockResponse.status, 200);
  assert.ok(calls.some((call) => /\/api\/inventory\/reports\/sales/.test(call.url)));
  assert.ok(calls.some((call) => /\/api\/inventory\/reports\/stock/.test(call.url)));
  assert.ok(calls.some((call) => /producto=9/.test(call.url)));
  assert.match(salesResponse.headers['content-disposition'], /ventas_2026-05-04\.csv/);
  assert.match(stockResponse.headers['content-disposition'], /stock_2026-05-04\.csv/);
  assert.match(salesResponse.text, /Cafe Venta/);
  assert.match(stockResponse.text, /Cafe Stock/);
});

test('POST /api/export bloquea usuarios no administradores', async () => {
  const app = createTestApp({
    user: { id_usuario: 2, nombre: 'Operador Demo', rol: 'Operador' },
    dataSources: {
      productos: [{ id_producto: 1, nombre: 'Cafe Premium' }],
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'productos', formato: 'CSV' });

  assert.equal(response.status, 403);
  assert.equal(response.body.error.code, 'AUTH_FORBIDDEN');
});

test('POST /api/export responde 404 sin datos y 400 con formato invalido', async () => {
  const app = createTestApp({
    dataSources: {
      productos: [],
    },
  });

  const emptyResponse = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'productos', formato: 'CSV' });

  assert.equal(emptyResponse.status, 404);
  assert.equal(emptyResponse.body.error.code, 'EXPORT_DATA_NOT_FOUND');

  const invalidFormat = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'productos', formato: 'TXT' });

  assert.equal(invalidFormat.status, 400);
  assert.equal(invalidFormat.body.error.code, 'VALIDATION_ERROR');
});

test('POST /api/export responde 413 cuando supera 100000 registros', async () => {
  const app = createTestApp({
    dataSources: {
      proveedores: Array.from({ length: MAX_EXPORT_RECORDS + 1 }, (_, index) => ({
        id_proveedor: index + 1,
        razon_social: `Proveedor ${index + 1}`,
      })),
    },
  });

  const response = await request(app)
    .post('/api/export')
    .send({ conjunto_datos: 'proveedores', formato: 'CSV' });

  assert.equal(response.status, 413);
  assert.equal(response.body.error.code, 'EXPORT_LIMIT_EXCEEDED');
});
