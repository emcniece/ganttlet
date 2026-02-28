import { useRef, useState, useCallback } from 'react'

export function useUndoRedo<T>(
  state: T,
  setState: React.Dispatch<React.SetStateAction<T>>,
  maxHistory: number = 50
): {
  setValue: React.Dispatch<React.SetStateAction<T>>
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
} {
  const undoStack = useRef<T[]>([])
  const redoStack = useRef<T[]>([])
  const stateRef = useRef(state)
  stateRef.current = state

  const [undoCount, setUndoCount] = useState(0)
  const [redoCount, setRedoCount] = useState(0)

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      undoStack.current.push(stateRef.current)
      if (undoStack.current.length > maxHistory) {
        undoStack.current.shift()
      }
      redoStack.current = []
      setUndoCount(undoStack.current.length)
      setRedoCount(0)
      setState(action)
    },
    [setState, maxHistory]
  )

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return
    const prev = undoStack.current.pop()!
    redoStack.current.push(stateRef.current)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)
    setState(prev)
  }, [setState])

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return
    const next = redoStack.current.pop()!
    undoStack.current.push(stateRef.current)
    setUndoCount(undoStack.current.length)
    setRedoCount(redoStack.current.length)
    setState(next)
  }, [setState])

  return {
    setValue,
    undo,
    redo,
    canUndo: undoCount > 0,
    canRedo: redoCount > 0,
  }
}
