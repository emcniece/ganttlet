import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractSheetId, fetchSheetCSV } from '../sheetFetch'

describe('extractSheetId', () => {
  it('extracts ID from a full Google Sheets URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0'
    expect(extractSheetId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms')
  })

  it('extracts ID from a publish URL', () => {
    const url = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/pubhtml'
    expect(extractSheetId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms')
  })

  it('accepts a bare sheet ID', () => {
    const id = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms'
    expect(extractSheetId(id)).toBe(id)
  })

  it('trims whitespace from input', () => {
    const id = '  1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms  '
    expect(extractSheetId(id)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms')
  })

  it('handles IDs with hyphens and underscores', () => {
    const id = 'abc-DEF_123-456_xyz'
    expect(extractSheetId(id)).toBe(id)
  })

  it('throws on a short string that is not a valid ID', () => {
    expect(() => extractSheetId('abc')).toThrow('Could not extract')
  })

  it('throws on an empty string', () => {
    expect(() => extractSheetId('')).toThrow('Could not extract')
  })

  it('throws on a non-Google URL', () => {
    expect(() => extractSheetId('https://example.com/page')).toThrow('Could not extract')
  })
})

describe('fetchSheetCSV', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns CSV text on success', async () => {
    const csvContent = 'Task Name,Start Date\nAlpha,2025-01-01'
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csvContent),
    }))

    const result = await fetchSheetCSV('test-sheet-id')
    expect(result).toBe(csvContent)
    expect(fetch).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/test-sheet-id/gviz/tq?tqx=out:csv'
    )
  })

  it('throws on HTTP error response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }))

    await expect(fetchSheetCSV('bad-id')).rejects.toThrow('HTTP 404')
  })

  it('throws when response is HTML (unpublished sheet)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<!DOCTYPE html><html><body>Error</body></html>'),
    }))

    await expect(fetchSheetCSV('unpublished')).rejects.toThrow('not published')
  })

  it('throws when response starts with <html', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body>Error</body></html>'),
    }))

    await expect(fetchSheetCSV('unpublished')).rejects.toThrow('not published')
  })
})
