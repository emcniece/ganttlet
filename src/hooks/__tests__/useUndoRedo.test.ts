import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useState } from 'react'
import { useUndoRedo } from '../useUndoRedo'

function useWrapper(initial: number) {
  const [state, setState] = useState(initial)
  const undoRedo = useUndoRedo(state, setState)
  return { state, ...undoRedo }
}

describe('useUndoRedo', () => {
  it('starts with canUndo and canRedo both false', () => {
    const { result } = renderHook(() => useWrapper(0))

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('tracks changes and enables undo', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))

    expect(result.current.state).toBe(1)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('undoes to the previous state', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))
    act(() => result.current.undo())

    expect(result.current.state).toBe(0)
    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(true)
  })

  it('redoes a previously undone change', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))
    act(() => result.current.undo())
    act(() => result.current.redo())

    expect(result.current.state).toBe(1)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('clears redo stack when a new change is made after undo', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))
    act(() => result.current.undo())
    act(() => result.current.setValue(2))

    expect(result.current.state).toBe(2)
    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(false)
  })

  it('handles multiple undo/redo steps', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))
    act(() => result.current.setValue(2))
    act(() => result.current.setValue(3))

    act(() => result.current.undo())
    expect(result.current.state).toBe(2)

    act(() => result.current.undo())
    expect(result.current.state).toBe(1)

    act(() => result.current.redo())
    expect(result.current.state).toBe(2)
  })

  it('does nothing when undoing with empty stack', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.undo())

    expect(result.current.state).toBe(0)
    expect(result.current.canUndo).toBe(false)
  })

  it('does nothing when redoing with empty stack', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.redo())

    expect(result.current.state).toBe(0)
    expect(result.current.canRedo).toBe(false)
  })

  it('reset clears both stacks', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue(1))
    act(() => result.current.setValue(2))
    act(() => result.current.undo())

    expect(result.current.canUndo).toBe(true)
    expect(result.current.canRedo).toBe(true)

    act(() => result.current.reset())

    expect(result.current.canUndo).toBe(false)
    expect(result.current.canRedo).toBe(false)
  })

  it('respects maxHistory limit', () => {
    const { result } = renderHook(() => {
      const [state, setState] = useState(0)
      const undoRedo = useUndoRedo(state, setState, 3)
      return { state, ...undoRedo }
    })

    act(() => result.current.setValue(1))
    act(() => result.current.setValue(2))
    act(() => result.current.setValue(3))
    act(() => result.current.setValue(4))

    // Stack should only hold 3 entries, so we can undo 3 times
    act(() => result.current.undo())
    expect(result.current.state).toBe(3)

    act(() => result.current.undo())
    expect(result.current.state).toBe(2)

    act(() => result.current.undo())
    expect(result.current.state).toBe(1)

    // Should not be able to undo further (initial 0 was pushed out)
    expect(result.current.canUndo).toBe(false)
  })

  it('accepts a function updater via setValue', () => {
    const { result } = renderHook(() => useWrapper(0))

    act(() => result.current.setValue((prev) => prev + 10))

    expect(result.current.state).toBe(10)
    expect(result.current.canUndo).toBe(true)
  })
})
