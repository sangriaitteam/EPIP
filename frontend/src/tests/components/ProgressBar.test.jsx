/**
 * Component tests — ProgressBar
 */
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ProgressBar from '../../components/common/ProgressBar'

describe('ProgressBar component', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProgressBar value={50} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows percentage label when showPercent=true', () => {
    const { container } = render(<ProgressBar value={75} showPercent={true} />)
    expect(container.textContent).toContain('75%')
  })

  it('hides percentage when showPercent=false', () => {
    const { container } = render(<ProgressBar value={75} showPercent={false} />)
    expect(container.textContent).not.toContain('%')
  })

  it('shows label text when provided', () => {
    const { container } = render(<ProgressBar value={40} label="Completion" />)
    expect(container.textContent).toContain('Completion')
  })

  it('clamps value to 0–100 range', () => {
    // value > 100 should display 100%
    const { container: highContainer } = render(<ProgressBar value={150} showPercent />)
    expect(highContainer.textContent).toContain('100%')

    // negative value should display 0%
    const { container: lowContainer } = render(<ProgressBar value={-10} showPercent />)
    expect(lowContainer.textContent).toContain('0%')
  })

  it('renders with default value 0', () => {
    const { container } = render(<ProgressBar />)
    expect(container.firstChild).toBeTruthy()
  })

  it('accepts size prop without crashing', () => {
    const { container: sm } = render(<ProgressBar value={50} size="sm" />)
    const { container: md } = render(<ProgressBar value={50} size="md" />)
    const { container: lg } = render(<ProgressBar value={50} size="lg" />)
    expect(sm.firstChild).toBeTruthy()
    expect(md.firstChild).toBeTruthy()
    expect(lg.firstChild).toBeTruthy()
  })
})
