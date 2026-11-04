'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');

const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const { Pool } = require('pg');

const MAX_EXPORT_RECORDS = 100000;
const TEMP_FILE_TTL_MS = 60 * 60 * 1000;

const DATASETS = Object.freeze({
  PRODUCTOS: 'productos',
  MOVIMIENTOS: 'movimientos',
  VENTAS: 'ventas',
  STOCK: 'stock',
  PROVEEDORES: 'proveedores',
  CATEGORIAS: 'categorias',
  TODO: 'todo',
});

const DATASET_ORDER = [
  DATASETS.PRODUCTOS,
  DATASETS.MOVIMIENTOS,
  DATASETS.PROVEEDORES,
  DATASETS.CATEGORIAS,
];

const DATASET_LABELS = Object.freeze({
  [DATASETS.PRODUCTOS]: 'Productos',
  [DATASETS.MOVIMIENTOS]: 'Movimientos',
  [DATASETS.VENTAS]: 'Ventas',
  [DATASETS.STOCK]: 'Stock actual',
  [DATASETS.PROVEEDORES]: 'Proveedores',
  [DATASETS.CATEGORIAS]: 'Categorias',
  [DATASETS.TODO]: 'Exportacion completa',
});

const DATASET_ALIASES = Object.freeze({
  productos: DATASETS.PRODUCTOS,
  products: DATASETS.PRODUCTOS,
  movimientos: DATASETS.MOVIMIENTOS,
  movements: DATASETS.MOVIMIENTOS,
  ventas: DATASETS.VENTAS,
  venta: DATASETS.VENTAS,
  sales: DATASETS.VENTAS,
  sale: DATASETS.VENTAS,
  stock: DATASETS.STOCK,
  stock_actual: DATASETS.STOCK,
  current_stock: DATASETS.STOCK,
  proveedores: DATASETS.PROVEEDORES,
  suppliers: DATASETS.PROVEEDORES,
  categorias: DATASETS.CATEGORIAS,
  categories: DATASETS.CATEGORIAS,
  todo: DATASETS.TODO,
  all: DATASETS.TODO,
});

const FORMAT_ALIASES = Object.freeze({
  csv: { key: 'csv', ext: 'csv', contentType: 'text/csv; charset=utf-8' },
  json: { key: 'json', ext: 'json', contentType: 'application/json; charset=utf-8' },
  pdf: { key: 'pdf', ext: 'pdf', contentType: 'application/pdf' },
  excel: {
    key: 'excel',
    ext: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
  xlsx: {
    key: 'excel',
    ext: 'xlsx',
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  },
});

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwd',
  'contrasena',
  'contrasena_hash',
  'token',
  'access_token',
  'refresh_token',
  'session_token',
  'sesion_token',
  'jwt',
  'api_key',
  'secret',
]);

const EXPORT_THEME = Object.freeze({
  navy: 'FF1F3A5F',
  blue: 'FF2563EB',
  lightBlue: 'FFEAF2FF',
  green: 'FF0F766E',
  gray900: 'FF111827',
  gray700: 'FF374151',
  gray500: 'FF6B7280',
  gray200: 'FFE5E7EB',
  gray100: 'FFF3F4F6',
  white: 'FFFFFFFF',
});

class ExportError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function normalizeString(value) {
  return typeof value === 'string' ? value.trim() : String(value || '').trim();
}

function normalizeKey(value) {
  return normalizeString(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

function normalizeDate(value, fieldName) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeString(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new ExportError(400, 'VALIDATION_ERROR', `${fieldName} debe tener formato YYYY-MM-DD`);
  }

  const date = new Date(`${normalized}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ExportError(400, 'VALIDATION_ERROR', `${fieldName} no es una fecha valida`);
  }

  return normalized;
}

function normalizePositiveInteger(value, fieldName) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  const normalized = Number(value);
  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new ExportError(400, 'VALIDATION_ERROR', `${fieldName} debe ser un entero positivo`);
  }

  return normalized;
}

function normalizeOptionalReportType(value) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  const reportType = DATASET_ALIASES[normalizeKey(value)];
  if (![DATASETS.MOVIMIENTOS, DATASETS.VENTAS, DATASETS.STOCK].includes(reportType)) {
    throw new ExportError(
      400,
      'VALIDATION_ERROR',
      'report_type debe ser movements, sales o stock'
    );
  }
  return reportType;
}

function normalizeOptionalMovementType(value) {
  if (typeof value === 'undefined' || value === null || value === '') {
    return undefined;
  }

  const normalized = normalizeKey(value);
  if (!['entrada', 'salida', 'ajuste'].includes(normalized)) {
    throw new ExportError(
      400,
      'VALIDATION_ERROR',
      'tipo debe ser entrada, salida o ajuste'
    );
  }
  return normalized;
}

function normalizeExportRequest(body = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new ExportError(400, 'VALIDATION_ERROR', 'El cuerpo de la solicitud es obligatorio');
  }

  const reportDataset = normalizeOptionalReportType(body.report_type || body.reportType);
  const datasetKey = normalizeKey(body.conjunto_datos || body.dataset || body.entidad);
  const dataset = DATASET_ALIASES[datasetKey];
  if (!dataset && !reportDataset) {
    throw new ExportError(
      400,
      'VALIDATION_ERROR',
      'conjunto_datos debe ser productos, movimientos, ventas, stock, proveedores, categorias o todo'
    );
  }

  const formatKey = normalizeKey(body.formato || body.format);
  const format = FORMAT_ALIASES[formatKey];
  if (!format) {
    throw new ExportError(
      400,
      'VALIDATION_ERROR',
      'formato debe ser CSV, JSON, PDF, EXCEL o XLSX'
    );
  }

  const fecha_inicio = normalizeDate(body.fecha_inicio, 'fecha_inicio');
  const fecha_fin = normalizeDate(body.fecha_fin, 'fecha_fin');
  if (fecha_inicio && fecha_fin && fecha_inicio > fecha_fin) {
    throw new ExportError(400, 'VALIDATION_ERROR', 'fecha_inicio no puede ser mayor a fecha_fin');
  }

  return {
    conjunto_datos: reportDataset || dataset,
    formato: format,
    filters: {
      fecha_inicio,
      fecha_fin,
      id_categoria: normalizePositiveInteger(body.id_categoria, 'id_categoria'),
      id_producto: normalizePositiveInteger(
        body.id_producto || body.producto || body.productId,
        'id_producto'
      ),
      tipo: normalizeOptionalMovementType(body.tipo || body.tipo_movimiento),
    },
  };
}

function buildUrl(baseUrl, urlPath, query = {}) {
  const url = new URL(urlPath, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
}

function extractRows(payload, preferredKeys = []) {
  if (Array.isArray(payload)) {
    return payload;
  }

  const candidates = [payload?.data, payload, payload?.data?.data];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }

    for (const key of preferredKeys) {
      if (Array.isArray(candidate?.[key])) {
        return candidate[key];
      }
    }

    for (const key of ['items', 'productos', 'categorias', 'proveedores', 'movimientos']) {
      if (Array.isArray(candidate?.[key])) {
        return candidate[key];
      }
    }
  }

  return [];
}

function isSensitiveKey(key) {
  const normalized = normalizeKey(key);
  return (
    SENSITIVE_KEYS.has(normalized) ||
    normalized.includes('password') ||
    normalized.includes('contrasena') ||
    normalized.includes('token') ||
    normalized.endsWith('_hash') ||
    normalized.includes('session')
  );
}

function stripSensitiveFields(value) {
  if (Array.isArray(value)) {
    return value.map(stripSensitiveFields);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.entries(value).reduce((safe, [key, item]) => {
    if (!isSensitiveKey(key)) {
      safe[key] = stripSensitiveFields(item);
    }
    return safe;
  }, {});
}

function flattenValue(value) {
  if (value === null || typeof value === 'undefined') {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return value;
}

function formatDisplayValue(value) {
  const flattened = flattenValue(value);
  if (typeof flattened === 'boolean') {
    return flattened ? 'Si' : 'No';
  }
  if (typeof flattened === 'string' && flattened.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(flattened)) {
    return flattened.slice(0, 10);
  }
  return flattened;
}

function titleCase(value) {
  return normalizeString(value)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/(^|\s)\S/g, (match) => match.toUpperCase());
}

function columnLabel(column) {
  const customLabels = {
    id_producto: 'ID producto',
    id_movimiento: 'ID movimiento',
    id_proveedor: 'ID proveedor',
    id_categoria: 'ID categoria',
    codigo_barras_unico: 'Codigo de barras',
    nombre_categoria: 'Categoria',
    precio_compra: 'Precio compra',
    precio_venta: 'Precio venta',
    stock_actual: 'Stock actual',
    stock_minimo: 'Stock minimo',
    stock_maximo: 'Stock maximo',
    fecha_vencimiento: 'Fecha vencimiento',
    fecha_creacion: 'Fecha creacion',
    razon_social: 'Razon social',
    nit_identificacion: 'NIT',
    valor_total: 'Valor total',
    precio_unitario: 'Precio unitario',
    stock_anterior: 'Stock anterior',
    stock_posterior: 'Stock posterior',
  };
  return customLabels[column] || titleCase(column);
}

function datasetLabel(dataset) {
  return DATASET_LABELS[dataset] || titleCase(dataset);
}

function formatFilterValue(value) {
  if (value === undefined || value === null || value === '') {
    return 'No aplica';
  }
  return String(value);
}

function collectColumns(rows = []) {
  const columns = [];
  const seen = new Set();

  rows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    });
  });

  return columns;
}

function toCsvCell(value) {
  const text = String(flattenValue(value));
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildCsvContent(dataByDataset, { includeDatasetColumn }) {
  const rows = Object.entries(dataByDataset).flatMap(([dataset, items]) =>
    items.map((item) => (includeDatasetColumn ? { conjunto_datos: dataset, ...item } : item))
  );
  const columns = collectColumns(rows);
  const lines = [columns.map(toCsvCell).join(',')];

  rows.forEach((row) => {
    lines.push(columns.map((column) => toCsvCell(row[column])).join(','));
  });

  return `\uFEFF${lines.join('\n')}\n`;
}

async function writeJson(filePath, dataByDataset, meta) {
  const content = JSON.stringify({ meta, data: dataByDataset }, null, 2);
  await fsp.writeFile(filePath, content, 'utf8');
}

async function writeCsv(filePath, dataByDataset, meta) {
  const includeDatasetColumn = meta.conjunto_datos === DATASETS.TODO;
  await fsp.writeFile(filePath, buildCsvContent(dataByDataset, { includeDatasetColumn }), 'utf8');
}

function normalizeSheetName(name) {
  return name.replace(/[\\/*?:[\]]/g, '').slice(0, 31) || 'export';
}

function setWorksheetColumnWidths(worksheet, columns, rows) {
  columns.forEach((column, index) => {
    const sampleValues = rows.slice(0, 250).map((row) => String(formatDisplayValue(row[column]) || ''));
    const maxContentLength = Math.max(columnLabel(column).length, ...sampleValues.map((value) => value.length));
    worksheet.getColumn(index + 1).width = Math.min(44, Math.max(14, maxContentLength + 3));
  });
}

function styleExcelHeaderRow(row) {
  row.height = 24;
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: EXPORT_THEME.white }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXPORT_THEME.navy },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: EXPORT_THEME.navy } },
      left: { style: 'thin', color: { argb: EXPORT_THEME.navy } },
      bottom: { style: 'thin', color: { argb: EXPORT_THEME.navy } },
      right: { style: 'thin', color: { argb: EXPORT_THEME.navy } },
    };
  });
}

function styleExcelDataRow(row, rowIndex) {
  row.eachCell((cell) => {
    cell.alignment = { vertical: 'top', wrapText: true };
    cell.border = {
      bottom: { style: 'thin', color: { argb: EXPORT_THEME.gray200 } },
    };
    if (rowIndex % 2 === 0) {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: EXPORT_THEME.gray100 },
      };
    }
  });
}

function addSummaryWorksheet(workbook, dataByDataset, meta) {
  const worksheet = workbook.addWorksheet('Resumen', {
    properties: { tabColor: { argb: EXPORT_THEME.blue } },
    views: [{ showGridLines: false }],
  });

  worksheet.mergeCells('A1:D1');
  worksheet.getCell('A1').value = 'TIENDATA - Exportacion de datos';
  worksheet.getCell('A1').font = { bold: true, size: 18, color: { argb: EXPORT_THEME.white } };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: EXPORT_THEME.navy },
  };
  worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 32;

  const infoRows = [
    ['Conjunto solicitado', datasetLabel(meta.conjunto_datos)],
    ['Formato', meta.formato.toUpperCase()],
    ['Generado', meta.generatedAt],
    ['Total registros', meta.total_registros],
    ['Fecha inicio', formatFilterValue(meta.filtros.fecha_inicio)],
    ['Fecha fin', formatFilterValue(meta.filtros.fecha_fin)],
    ['Categoria', formatFilterValue(meta.filtros.id_categoria)],
  ];

  infoRows.forEach(([label, value], index) => {
    const row = worksheet.getRow(index + 3);
    row.values = [label, value];
    row.getCell(1).font = { bold: true, color: { argb: EXPORT_THEME.gray700 } };
    row.getCell(2).font = { color: { argb: EXPORT_THEME.gray900 } };
  });

  const tableStart = 12;
  worksheet.getRow(tableStart).values = ['Entidad', 'Registros'];
  styleExcelHeaderRow(worksheet.getRow(tableStart));

  Object.entries(dataByDataset).forEach(([dataset, rows], index) => {
    const row = worksheet.getRow(tableStart + index + 1);
    row.values = [datasetLabel(dataset), rows.length];
    styleExcelDataRow(row, index);
  });

  worksheet.columns = [{ width: 28 }, { width: 22 }, { width: 18 }, { width: 18 }];
}

async function writeExcel(filePath, dataByDataset, meta) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TIENDATA MS-12';
  workbook.lastModifiedBy = 'TIENDATA MS-12';
  workbook.created = new Date(meta.generatedAt);
  workbook.modified = new Date(meta.generatedAt);
  workbook.subject = 'Exportacion masiva de datos';
  workbook.title = `Exportacion ${datasetLabel(meta.conjunto_datos)}`;

  addSummaryWorksheet(workbook, dataByDataset, meta);

  Object.entries(dataByDataset).forEach(([dataset, rows]) => {
    if (rows.length === 0) {
      return;
    }

    const worksheet = workbook.addWorksheet(normalizeSheetName(datasetLabel(dataset)), {
      properties: { tabColor: { argb: EXPORT_THEME.green } },
      views: [{ state: 'frozen', ySplit: 5, showGridLines: false }],
    });
    const columns = collectColumns(rows);
    if (columns.length === 0) {
      columns.push('registro');
    }
    const lastColumnLetter = worksheet.getColumn(columns.length || 1).letter;

    worksheet.mergeCells(`A1:${lastColumnLetter}1`);
    worksheet.getCell('A1').value = datasetLabel(dataset);
    worksheet.getCell('A1').font = { bold: true, size: 16, color: { argb: EXPORT_THEME.white } };
    worksheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: EXPORT_THEME.navy },
    };
    worksheet.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells(`A2:${lastColumnLetter}2`);
    worksheet.getCell('A2').value = `Generado: ${meta.generatedAt} | Registros: ${rows.length}`;
    worksheet.getCell('A2').font = { italic: true, color: { argb: EXPORT_THEME.gray700 } };
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.getRow(4).values = columns.map(columnLabel);
    styleExcelHeaderRow(worksheet.getRow(4));

    rows.forEach((row, index) => {
      const excelRow = worksheet.addRow(
        columns.map((column) => (column === 'registro' ? index + 1 : formatDisplayValue(row[column])))
      );
      styleExcelDataRow(excelRow, excelRow.number);
    });

    setWorksheetColumnWidths(worksheet, columns, rows);
    worksheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + rows.length, column: columns.length },
    };
  });

  await workbook.xlsx.writeFile(filePath);
}

function pdfColor(color) {
  return `#${color.slice(-6)}`;
}

function truncateText(value, maxLength = 42) {
  const text = String(formatDisplayValue(value) || '');
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function drawPdfHeader(doc, meta) {
  const pageWidth = doc.page.width;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const contentWidth = pageWidth - left - doc.page.margins.right;

  doc.rect(0, 0, pageWidth, 72).fill(pdfColor(EXPORT_THEME.navy));
  doc
    .fillColor(pdfColor(EXPORT_THEME.white))
    .fontSize(18)
    .text('TIENDATA', left, top - 10, { continued: true })
    .fontSize(12)
    .text('  Exportacion de datos', { width: contentWidth });

  doc
    .fontSize(8)
    .fillColor('#DDEBFF')
    .text(`Generado: ${meta.generatedAt}`, left, top + 18, { width: contentWidth / 2 })
    .text(`Registros: ${meta.total_registros}`, left + contentWidth / 2, top + 18, {
      width: contentWidth / 2,
      align: 'right',
    });

  doc.y = 92;
}

function drawPdfMeta(doc, meta) {
  const left = doc.page.margins.left;
  const cardTop = doc.y;
  const cardWidth = doc.page.width - left - doc.page.margins.right;
  const itemWidth = cardWidth / 4;
  const items = [
    ['Conjunto', datasetLabel(meta.conjunto_datos)],
    ['Formato', meta.formato.toUpperCase()],
    ['Fecha inicio', formatFilterValue(meta.filtros.fecha_inicio)],
    ['Fecha fin', formatFilterValue(meta.filtros.fecha_fin)],
  ];

  doc.roundedRect(left, cardTop, cardWidth, 48, 6).fillAndStroke('#F8FAFC', '#E5E7EB');
  items.forEach(([label, value], index) => {
    const x = left + itemWidth * index + 12;
    doc
      .fillColor(pdfColor(EXPORT_THEME.gray500))
      .fontSize(7)
      .text(label.toUpperCase(), x, cardTop + 10, { width: itemWidth - 18 });
    doc
      .fillColor(pdfColor(EXPORT_THEME.gray900))
      .fontSize(10)
      .text(truncateText(value, 26), x, cardTop + 24, { width: itemWidth - 18 });
  });

  doc.y = cardTop + 66;
}

function drawPdfPageNumber(doc) {
  const pageNumber = doc.bufferedPageRange().count;
  const y = doc.page.height - doc.page.margins.bottom - 12;
  doc
    .fontSize(7)
    .fillColor(pdfColor(EXPORT_THEME.gray500))
    .text(
      `Pagina ${pageNumber}`,
      doc.page.margins.left,
      y,
      { width: doc.page.width - doc.page.margins.left - doc.page.margins.right, align: 'right' }
    );
}

function ensurePdfSpace(doc, neededHeight, meta) {
  const bottom = doc.page.height - doc.page.margins.bottom - 24;
  if (doc.y + neededHeight <= bottom) {
    return;
  }

  drawPdfPageNumber(doc);
  doc.addPage();
  drawPdfHeader(doc, meta);
}

function drawPdfTable(doc, dataset, rows, meta) {
  const columns = collectColumns(rows).slice(0, 8);
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - left - doc.page.margins.right;
  const rowHeight = 22;
  const headerHeight = 24;
  const columnWidth = contentWidth / Math.max(columns.length, 1);
  const maxRows = 500;

  ensurePdfSpace(doc, 56, meta);
  doc
    .fillColor(pdfColor(EXPORT_THEME.navy))
    .fontSize(14)
    .text(datasetLabel(dataset), left, doc.y, { width: contentWidth });
  doc
    .fillColor(pdfColor(EXPORT_THEME.gray500))
    .fontSize(8)
    .text(`${rows.length} registros`, left, doc.y + 2, { width: contentWidth });
  doc.moveDown(0.8);

  const headerY = doc.y;
  doc.rect(left, headerY, contentWidth, headerHeight).fill(pdfColor(EXPORT_THEME.navy));
  columns.forEach((column, index) => {
    doc
      .fillColor(pdfColor(EXPORT_THEME.white))
      .fontSize(7.5)
      .text(columnLabel(column), left + columnWidth * index + 5, headerY + 7, {
        width: columnWidth - 10,
        height: headerHeight - 8,
        ellipsis: true,
      });
  });
  doc.y = headerY + headerHeight;

  rows.slice(0, maxRows).forEach((row, rowIndex) => {
    ensurePdfSpace(doc, rowHeight + headerHeight, meta);
    const y = doc.y;
    doc
      .rect(left, y, contentWidth, rowHeight)
      .fill(rowIndex % 2 === 0 ? '#FFFFFF' : '#F8FAFC');
    columns.forEach((column, columnIndex) => {
      doc
        .fillColor(pdfColor(EXPORT_THEME.gray900))
        .fontSize(7)
        .text(truncateText(row[column], 38), left + columnWidth * columnIndex + 5, y + 6, {
          width: columnWidth - 10,
          height: rowHeight - 8,
          ellipsis: true,
        });
    });
    doc
      .moveTo(left, y + rowHeight)
      .lineTo(left + contentWidth, y + rowHeight)
      .strokeColor('#E5E7EB')
      .lineWidth(0.4)
      .stroke();
    doc.y = y + rowHeight;
  });

  if (rows.length > maxRows) {
    doc.moveDown(0.6);
    doc
      .fillColor(pdfColor(EXPORT_THEME.gray700))
      .fontSize(8)
      .text(`Vista previa limitada a ${maxRows} filas. El total de registros de esta entidad es ${rows.length}.`);
  }

  if (collectColumns(rows).length > columns.length) {
    doc.moveDown(0.2);
    doc
      .fillColor(pdfColor(EXPORT_THEME.gray700))
      .fontSize(8)
  }

  doc.moveDown(1.4);
}

async function writePdf(filePath, dataByDataset, meta) {
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      margin: 36,
      size: 'A4',
      layout: 'landscape',
      bufferPages: true,
      info: {
        Title: `Exportacion ${datasetLabel(meta.conjunto_datos)}`,
        Author: 'TIENDATA MS-12',
        Subject: 'Exportacion masiva de datos',
      },
    });
    const stream = fs.createWriteStream(filePath);

    stream.on('finish', resolve);
    stream.on('error', reject);
    doc.on('error', reject);
    doc.pipe(stream);

    drawPdfHeader(doc, meta);
    drawPdfMeta(doc, meta);

    Object.entries(dataByDataset).forEach(([dataset, rows]) => {
      if (rows.length === 0) {
        return;
      }
      drawPdfTable(doc, dataset, rows, meta);
    });

    drawPdfPageNumber(doc);
    doc.end();
  });
}

function buildDefaultDbPool() {
  return new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'tiendata',
    database: process.env.DB_NAME || 'tiendata',
  });
}

class ExportService {
  constructor({
    inventoryServiceUrl = 'http://localhost:3005',
    auditServiceUrl = 'http://localhost:3006',
    fetchImpl = fetch,
    dataSources = {},
    dbPool,
    tempDir = path.join(os.tmpdir(), 'tiendata-exports'),
    nowProvider = () => new Date().toISOString(),
  } = {}) {
    this.inventoryServiceUrl = inventoryServiceUrl;
    this.auditServiceUrl = auditServiceUrl;
    this.fetchImpl = fetchImpl;
    this.dataSources = dataSources;
    this.dbPool = dbPool;
    this.tempDir = tempDir;
    this.nowProvider = nowProvider;
  }

  getPool() {
    if (!this.dbPool) {
      this.dbPool = buildDefaultDbPool();
    }
    return this.dbPool;
  }

  async readFromInjectedSource(dataset, filters, context) {
    const source = this.dataSources[dataset];
    if (!source) {
      return null;
    }

    const result = typeof source === 'function' ? await source(filters, context) : source;
    return extractRows(result);
  }

  async requestJson(url, context = {}) {
    const headers = { accept: 'application/json' };
    if (context.authorization) {
      headers.Authorization = context.authorization;
    }

    const response = await this.fetchImpl(url, { method: 'GET', headers });
    const payload = await response.json();
    if (!response.ok) {
      const message =
        payload?.error?.message || payload?.error || 'No fue posible consultar datos para exportacion';
      throw new ExportError(response.status >= 500 ? 502 : response.status, 'UPSTREAM_ERROR', message);
    }
    return payload;
  }

  async getProducts(filters, context) {
    const injected = await this.readFromInjectedSource(DATASETS.PRODUCTOS, filters, context);
    if (injected) {
      return injected;
    }

    const { rows } = await this.getPool().query(
      `
        SELECT
          p.id_producto,
          p.id_categoria,
          p.codigo_barras_unico,
          p.nombre,
          p.descripcion,
          c.nombre_categoria AS categoria,
          p.precio_compra,
          p.precio_venta,
          p.stock_actual,
          p.stock_minimo,
          p.stock_maximo,
          p.fecha_vencimiento,
          p.ubicacion,
          p.estado,
          p.fecha_creacion
        FROM productos p
        JOIN categorias c ON c.id_categoria = p.id_categoria
        WHERE ($1::int IS NULL OR p.id_categoria = $1)
          AND ($2::int IS NULL OR p.id_producto = $2)
        ORDER BY p.id_producto ASC
        LIMIT $3
      `,
      [filters.id_categoria || null, filters.id_producto || null, MAX_EXPORT_RECORDS + 1]
    );
    return rows;
  }

  async getInventoryReport(reportType, dataset, filters, context) {
    const injected = await this.readFromInjectedSource(dataset, filters, context);
    if (injected) {
      return injected;
    }

    const query = {
      fecha_inicio: filters.fecha_inicio,
      fecha_fin: filters.fecha_fin,
      categoria: filters.id_categoria,
      producto: filters.id_producto,
      tipo: reportType === 'movements' ? filters.tipo : undefined,
    };
    const url = buildUrl(this.inventoryServiceUrl, `/api/inventory/reports/${reportType}`, query);
    const payload = await this.requestJson(url, context);
    return extractRows(payload, ['items']);
  }

  async getMovements(filters, context) {
    return this.getInventoryReport('movements', DATASETS.MOVIMIENTOS, filters, context);
  }

  async getSales(filters, context) {
    return this.getInventoryReport('sales', DATASETS.VENTAS, filters, context);
  }

  async getStock(filters, context) {
    return this.getInventoryReport('stock', DATASETS.STOCK, filters, context);
  }

  async getSuppliers(filters, context) {
    const injected = await this.readFromInjectedSource(DATASETS.PROVEEDORES, filters, context);
    if (injected) {
      return injected;
    }

    const { rows } = await this.getPool().query(
      `
        SELECT id_proveedor, razon_social, nit_identificacion, telefono, direccion, correo, estado
        FROM proveedores
        ORDER BY id_proveedor ASC
        LIMIT $1
      `,
      [MAX_EXPORT_RECORDS + 1]
    );
    return rows;
  }

  async getCategories(filters, context) {
    const injected = await this.readFromInjectedSource(DATASETS.CATEGORIAS, filters, context);
    if (injected) {
      return injected;
    }

    const { rows } = await this.getPool().query(
      `
        SELECT id_categoria, nombre_categoria, descripcion, estado
        FROM categorias
        ORDER BY id_categoria ASC
        LIMIT $1
      `,
      [MAX_EXPORT_RECORDS + 1]
    );
    return rows;
  }

  async collectData(request, context) {
    const selected =
      request.conjunto_datos === DATASETS.TODO ? DATASET_ORDER : [request.conjunto_datos];
    const dataByDataset = {};

    for (const dataset of selected) {
      if (dataset === DATASETS.PRODUCTOS) {
        dataByDataset[dataset] = await this.getProducts(request.filters, context);
      } else if (dataset === DATASETS.MOVIMIENTOS) {
        dataByDataset[dataset] = await this.getMovements(request.filters, context);
      } else if (dataset === DATASETS.VENTAS) {
        dataByDataset[dataset] = await this.getSales(request.filters, context);
      } else if (dataset === DATASETS.STOCK) {
        dataByDataset[dataset] = await this.getStock(request.filters, context);
      } else if (dataset === DATASETS.PROVEEDORES) {
        dataByDataset[dataset] = await this.getSuppliers(request.filters, context);
      } else if (dataset === DATASETS.CATEGORIAS) {
        dataByDataset[dataset] = await this.getCategories(request.filters, context);
      }
    }

    return Object.fromEntries(
      Object.entries(dataByDataset).map(([dataset, rows]) => [
        dataset,
        stripSensitiveFields(rows),
      ])
    );
  }

  countRows(dataByDataset) {
    return Object.values(dataByDataset).reduce((total, rows) => total + rows.length, 0);
  }

  async notifyAudit({ actor, request, totalRows, filename }) {
    if (!this.auditServiceUrl) {
      return;
    }

    await this.fetchImpl(`${this.auditServiceUrl}/api/audit/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        action: 'exportar_datos',
        module: 'exportaciones',
        entity: request.conjunto_datos,
        user: actor
          ? {
              id_usuario: actor.id_usuario,
              nombre: actor.nombre,
              rol: actor.rol,
            }
          : undefined,
        detail: {
          formato: request.formato.key,
          total_registros: totalRows,
          archivo: filename,
          filtros: request.filters,
        },
      }),
    });
  }

  async createExport(body, context = {}) {
    const request = normalizeExportRequest(body);
    const dataByDataset = await this.collectData(request, context);
    const totalRows = this.countRows(dataByDataset);

    if (totalRows === 0) {
      throw new ExportError(
        404,
        'EXPORT_DATA_NOT_FOUND',
        'No se encontraron datos con los filtros seleccionados'
      );
    }

    if (totalRows > MAX_EXPORT_RECORDS) {
      throw new ExportError(
        413,
        'EXPORT_LIMIT_EXCEEDED',
        'El volumen supera el limite de 100.000 registros'
      );
    }

    const generatedAt = this.nowProvider();
    const datePart = generatedAt.slice(0, 10);
    const filename = `${request.conjunto_datos}_${datePart}.${request.formato.ext}`;
    const tempFilename = `${request.conjunto_datos}_${datePart}_${randomUUID()}.${request.formato.ext}`;
    await fsp.mkdir(this.tempDir, { recursive: true });
    const filePath = path.join(this.tempDir, tempFilename);

    const meta = {
      conjunto_datos: request.conjunto_datos,
      formato: request.formato.key,
      generatedAt,
      total_registros: totalRows,
      filtros: request.filters,
    };

    if (request.formato.key === 'csv') {
      await writeCsv(filePath, dataByDataset, meta);
    } else if (request.formato.key === 'json') {
      await writeJson(filePath, dataByDataset, meta);
    } else if (request.formato.key === 'excel') {
      await writeExcel(filePath, dataByDataset, meta);
    } else if (request.formato.key === 'pdf') {
      await writePdf(filePath, dataByDataset, meta);
    }

    void this.notifyAudit({
      actor: context.actor,
      request,
      totalRows,
      filename,
    }).catch(() => {});

    return {
      filePath,
      filename,
      contentType: request.formato.contentType,
      ttlMs: TEMP_FILE_TTL_MS,
      meta,
    };
  }
}

module.exports = {
  DATASETS,
  ExportError,
  ExportService,
  MAX_EXPORT_RECORDS,
  TEMP_FILE_TTL_MS,
  buildCsvContent,
  normalizeExportRequest,
  stripSensitiveFields,
};
