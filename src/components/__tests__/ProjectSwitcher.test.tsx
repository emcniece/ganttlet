import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ProjectSwitcher } from '../ProjectSwitcher'
import type { Project } from '../../types'

afterEach(cleanup)

const projects: Project[] = [
  { id: 'p1', name: 'Project Alpha' },
  { id: 'p2', name: 'Project Beta' },
]

function renderSwitcher(overrides: Partial<Parameters<typeof ProjectSwitcher>[0]> = {}) {
  const props = {
    projects,
    activeProjectId: 'p1',
    onSwitch: vi.fn(),
    onCreate: vi.fn().mockReturnValue('new-id'),
    onRename: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  }
  const result = render(<ProjectSwitcher {...props} />)
  return { ...result, props }
}

describe('ProjectSwitcher', () => {
  it('shows the active project name on the trigger button', () => {
    renderSwitcher()

    expect(screen.getByText('Project Alpha')).toBeInTheDocument()
  })

  it('shows "Project" fallback when active project is not found', () => {
    renderSwitcher({ activeProjectId: 'nonexistent' })

    expect(screen.getByText('Project')).toBeInTheDocument()
  })

  it('opens dropdown on click', () => {
    renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    expect(screen.getByText('Project Beta')).toBeInTheDocument()
    expect(screen.getByText('+ New Project')).toBeInTheDocument()
  })

  it('calls onSwitch when clicking a project', () => {
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))
    // Click on "Project Beta" in the dropdown
    fireEvent.click(screen.getAllByText('Project Beta')[0])

    expect(props.onSwitch).toHaveBeenCalledWith('p2')
  })

  it('calls onCreate and onSwitch when creating a new project', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('New Project')
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))
    fireEvent.click(screen.getByText('+ New Project'))

    expect(props.onCreate).toHaveBeenCalledWith('New Project')
    expect(props.onSwitch).toHaveBeenCalledWith('new-id')
  })

  it('does not create when prompt is cancelled', () => {
    vi.spyOn(window, 'prompt').mockReturnValue(null)
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))
    fireEvent.click(screen.getByText('+ New Project'))

    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('does not create when prompt returns empty string', () => {
    vi.spyOn(window, 'prompt').mockReturnValue('   ')
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))
    fireEvent.click(screen.getByText('+ New Project'))

    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('calls onDelete when confirming project deletion', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    expect(props.onDelete).toHaveBeenCalledWith('p1')
  })

  it('does not call onDelete when deletion is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const deleteButtons = screen.getAllByTitle('Delete')
    fireEvent.click(deleteButtons[0])

    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('disables delete when only one project exists', () => {
    const singleProject = [{ id: 'p1', name: 'Only Project' }]
    renderSwitcher({ projects: singleProject })

    fireEvent.click(screen.getByText('Only Project'))

    const deleteButton = screen.getByTitle('Delete')
    expect(deleteButton).toBeDisabled()
  })

  it('shows rename input when rename button is clicked', () => {
    renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const renameButtons = screen.getAllByTitle('Rename')
    fireEvent.click(renameButtons[0])

    const input = screen.getByDisplayValue('Project Alpha')
    expect(input).toBeInTheDocument()
  })

  it('calls onRename when Enter is pressed in rename input', () => {
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const renameButtons = screen.getAllByTitle('Rename')
    fireEvent.click(renameButtons[0])

    const input = screen.getByDisplayValue('Project Alpha')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(props.onRename).toHaveBeenCalledWith('p1', 'Renamed')
  })

  it('cancels rename when Escape is pressed', () => {
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const renameButtons = screen.getAllByTitle('Rename')
    fireEvent.click(renameButtons[0])

    const input = screen.getByDisplayValue('Project Alpha')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    expect(props.onRename).not.toHaveBeenCalled()
  })

  it('commits rename on blur', () => {
    const { props } = renderSwitcher()

    fireEvent.click(screen.getByText('Project Alpha'))

    const renameButtons = screen.getAllByTitle('Rename')
    fireEvent.click(renameButtons[0])

    const input = screen.getByDisplayValue('Project Alpha')
    fireEvent.change(input, { target: { value: 'Blurred Name' } })
    fireEvent.blur(input)

    expect(props.onRename).toHaveBeenCalledWith('p1', 'Blurred Name')
  })
})
