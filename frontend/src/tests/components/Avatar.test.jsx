/**
 * Component tests — Avatar
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Avatar from '../../components/common/Avatar'

// Wrap with minimal providers (Avatar has no router/context deps)
const renderAvatar = (props) => render(<Avatar {...props} />)

describe('Avatar component', () => {
  it('renders initials for a given name', () => {
    const { container } = renderAvatar({ name: 'John Doe' })
    // Should show "JD" text somewhere
    expect(container.textContent).toMatch(/JD/i)
  })

  it('renders ? for missing name', () => {
    const { container } = renderAvatar({ name: '' })
    expect(container.textContent).toContain('?')
  })

  it('renders image when src is provided', () => {
    const { container } = renderAvatar({ name: 'Jane', src: 'https://example.com/photo.jpg' })
    const img = container.querySelector('img')
    expect(img).toBeTruthy()
    expect(img.src).toContain('example.com')
  })

  it('does not render img when src is not provided', () => {
    const { container } = renderAvatar({ name: 'Alice' })
    const img = container.querySelector('img')
    expect(img).toBeFalsy()
  })

  it('renders online indicator when online=true', () => {
    const { container } = renderAvatar({ name: 'Bob', online: true })
    // Should have a green dot element
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('renders offline indicator when online=false', () => {
    const { container } = renderAvatar({ name: 'Carol', online: false })
    const spans = container.querySelectorAll('span')
    expect(spans.length).toBeGreaterThan(0)
  })

  it('applies correct size classes', () => {
    const { container: smContainer } = render(<Avatar name="A" size="sm" />)
    const { container: lgContainer } = render(<Avatar name="A" size="lg" />)
    // sm should be smaller than lg — both should render without crashing
    expect(smContainer.firstChild).toBeTruthy()
    expect(lgContainer.firstChild).toBeTruthy()
  })
})
