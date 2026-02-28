import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { SettingsModal } from '../SettingsModal'
import type { AppSettings } from '../../types'

afterEach(cleanup)

const defaultSettings: AppSettings = { chartStartDate: '', chartEndDate: '' }

function renderModal(overrides: Partial<Parameters<typeof SettingsModal>[0]> = {}) {
  const props = {
    settings: defaultSettings,
    clientId: '',
    onSave: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
  const result = render(<SettingsModal {...props} />)
  return { ...result, props }
}

describe('SettingsModal', () => {
  it('renders General and OAuth tabs', () => {
    renderModal()

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'OAuth' })).toBeInTheDocument()
  })

  it('shows General tab content by default', () => {
    renderModal()

    expect(screen.getByLabelText('Chart Start Date')).toBeInTheDocument()
    expect(screen.getByLabelText('Chart End Date')).toBeInTheDocument()
  })

  it('does not show OAuth content when General tab is active', () => {
    renderModal()

    expect(screen.queryByLabelText('Google Cloud OAuth Client ID')).not.toBeInTheDocument()
  })

  it('switches to OAuth tab and shows Client ID input', () => {
    renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'OAuth' }))

    expect(screen.getByLabelText('Google Cloud OAuth Client ID')).toBeInTheDocument()
    expect(screen.queryByLabelText('Chart Start Date')).not.toBeInTheDocument()
  })

  it('pre-fills date inputs from settings prop', () => {
    renderModal({
      settings: { chartStartDate: '2025-01-01', chartEndDate: '2025-06-30' },
    })

    expect(screen.getByLabelText('Chart Start Date')).toHaveValue('2025-01-01')
    expect(screen.getByLabelText('Chart End Date')).toHaveValue('2025-06-30')
  })

  it('pre-fills Client ID from clientId prop', () => {
    renderModal({ clientId: 'test-client-id' })

    fireEvent.click(screen.getByRole('button', { name: 'OAuth' }))

    expect(screen.getByLabelText('Google Cloud OAuth Client ID')).toHaveValue('test-client-id')
  })

  it('clears start date when Clear button is clicked', () => {
    renderModal({
      settings: { chartStartDate: '2025-01-01', chartEndDate: '' },
    })

    const clearButtons = screen.getAllByRole('button', { name: 'Clear' })
    fireEvent.click(clearButtons[0])

    expect(screen.getByLabelText('Chart Start Date')).toHaveValue('')
  })

  it('clears end date when Clear button is clicked', () => {
    renderModal({
      settings: { chartStartDate: '', chartEndDate: '2025-12-31' },
    })

    const clearButtons = screen.getAllByRole('button', { name: 'Clear' })
    fireEvent.click(clearButtons[1])

    expect(screen.getByLabelText('Chart End Date')).toHaveValue('')
  })

  it('calls onSave with settings and clientId on submit', () => {
    const { props } = renderModal()

    // Set dates on General tab
    fireEvent.change(screen.getByLabelText('Chart Start Date'), {
      target: { value: '2025-03-01' },
    })
    fireEvent.change(screen.getByLabelText('Chart End Date'), {
      target: { value: '2025-09-30' },
    })

    // Switch to OAuth tab and set client ID
    fireEvent.click(screen.getByRole('button', { name: 'OAuth' }))
    fireEvent.change(screen.getByLabelText('Google Cloud OAuth Client ID'), {
      target: { value: '  my-client-id  ' },
    })

    // Submit
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(props.onSave).toHaveBeenCalledWith(
      { chartStartDate: '2025-03-01', chartEndDate: '2025-09-30' },
      'my-client-id'
    )
  })

  it('calls onCancel when Cancel is clicked', () => {
    const { props } = renderModal()

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(props.onCancel).toHaveBeenCalled()
  })

  it('preserves values across tab switches', () => {
    renderModal()

    // Set a start date
    fireEvent.change(screen.getByLabelText('Chart Start Date'), {
      target: { value: '2025-05-15' },
    })

    // Switch to OAuth, then back to General
    fireEvent.click(screen.getByRole('button', { name: 'OAuth' }))
    fireEvent.click(screen.getByRole('button', { name: 'General' }))

    expect(screen.getByLabelText('Chart Start Date')).toHaveValue('2025-05-15')
  })
})
