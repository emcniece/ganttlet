import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from '../useLocalStorage'

beforeEach(() => {
  localStorage.clear()
})

describe('useLocalStorage', () => {
  it('returns the initial value when storage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    expect(result.current[0]).toBe('default')
  })

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('key', JSON.stringify('stored'))

    const { result } = renderHook(() => useLocalStorage('key', 'default'))

    expect(result.current[0]).toBe('stored')
  })

  it('persists updates to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'initial'))

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(JSON.parse(localStorage.getItem('key')!)).toBe('updated')
  })

  it('falls back to initial value on bad JSON in storage', () => {
    localStorage.setItem('key', 'not-valid-json')

    const { result } = renderHook(() => useLocalStorage('key', 'fallback'))

    expect(result.current[0]).toBe('fallback')
  })

  it('round-trips an object value (e.g. AppSettings)', () => {
    const initial = { chartStartDate: '', chartEndDate: '' }

    const { result } = renderHook(() => useLocalStorage('settings', initial))

    act(() => {
      result.current[1]({ chartStartDate: '2025-01-01', chartEndDate: '2025-12-31' })
    })

    expect(result.current[0]).toEqual({
      chartStartDate: '2025-01-01',
      chartEndDate: '2025-12-31',
    })
    expect(JSON.parse(localStorage.getItem('settings')!)).toEqual({
      chartStartDate: '2025-01-01',
      chartEndDate: '2025-12-31',
    })
  })
})
