import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildReportQuery,
  getReport,
  getReportFiltersCatalog,
  normalizeCatalogResponse,
} from './reports.js'

describe('reports api helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem('tiendata_token', 'token-123')
    vi.restoreAllMocks()
  })

  it('buildReportQuery only includes filters supported by the selected report', () => {
    expect(buildReportQuery('stock', {
      categoria: '7',
      producto: '9',
      fecha_inicio: '2026-05-01',
      tipo: 'salida',
    })).toBe('categoria=7&producto=9')

    expect(buildReportQuery('movements', {
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-03',
      categoria: '7',
      producto: '',
      tipo: 'salida',
    })).toBe('fecha_inicio=2026-05-01&fecha_fin=2026-05-03&categoria=7&tipo=salida')
  })

  it('normalizeCatalogResponse accepts observable categories and products payload shapes', () => {
    expect(normalizeCatalogResponse({
      categoriesResponse: { data: { categorias: [{ id_categoria: 1, nombre_categoria: 'Bebidas' }] } },
      productsResponse: { data: { productos: [{ id_producto: 2, nombre: 'Café' }] } },
    })).toEqual({
      categories: [{ id_categoria: 1, nombre_categoria: 'Bebidas' }],
      products: [{ id_producto: 2, nombre: 'Café' }],
    })

    expect(normalizeCatalogResponse({
      categoriesResponse: { data: [{ id_categoria: 3, nombre_categoria: 'Snacks' }] },
      productsResponse: { data: { items: [{ id_producto: 4, nombre: 'Galletas' }] } },
    })).toEqual({
      categories: [{ id_categoria: 3, nombre_categoria: 'Snacks' }],
      products: [{ id_producto: 4, nombre: 'Galletas' }],
    })
  })

  it('getReport sends auth plus supported query params and unwraps payload data', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          meta: { reportType: 'sales' },
          summary: { total_items: 1, total_quantity: 2, total_value: 3000 },
          columns: [],
          items: [],
        },
      }),
    })

    const data = await getReport('sales', {
      fecha_inicio: '2026-05-01',
      fecha_fin: '2026-05-03',
      categoria: '5',
      tipo: 'salida',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/inventory/reports/sales?fecha_inicio=2026-05-01&fecha_fin=2026-05-03&categoria=5',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'Content-Type': 'application/json',
        }),
      }),
    )
    expect(data).toEqual(expect.objectContaining({ meta: { reportType: 'sales' } }))
  })

  it('getReportFiltersCatalog normalizes categories and products catalog payloads', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { categorias: [{ id_categoria: 1, nombre_categoria: 'Bebidas' }] } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: { items: [{ id_producto: 8, nombre: 'Té' }] } }) })

    await expect(getReportFiltersCatalog()).resolves.toEqual({
      categories: [{ id_categoria: 1, nombre_categoria: 'Bebidas' }],
      products: [{ id_producto: 8, nombre: 'Té' }],
    })
  })
})
