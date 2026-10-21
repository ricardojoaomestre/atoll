import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AgentSprite } from './agent-sprite'
import { makeAgent } from '../test/fixtures'

describe('AgentSprite', () => {
  it('shows a question badge when wondering', () => {
    render(<AgentSprite agent={makeAgent({ status: 'needs-question' })} />)
    expect(screen.getByText('?')).toBeInTheDocument()
  })

  it('shows permission copy when waiting for approval', () => {
    render(<AgentSprite agent={makeAgent({ status: 'needs-permission' })} />)
    expect(screen.getByText('OK?')).toBeInTheDocument()
  })

  it('renders a button and handles clicks for interactive sprites', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    const { container } = render(<AgentSprite agent={makeAgent()} onClick={onClick} />)
    const sprite = container.querySelector('[data-agent-sprite]')
    expect(sprite?.tagName).toBe('BUTTON')

    await user.click(sprite!)
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('reports keyboard focus and blur', async () => {
    const user = userEvent.setup()
    const onFocus = vi.fn()
    const onBlur = vi.fn()
    render(
      <AgentSprite agent={makeAgent()} onFocus={onFocus} onBlur={onBlur} />,
    )

    await user.tab()
    expect(onFocus).toHaveBeenCalledOnce()
    await user.tab()
    expect(onBlur).toHaveBeenCalledOnce()
  })

  it('reports hover enter and leave', async () => {
    const user = userEvent.setup()
    const onMouseEnter = vi.fn()
    const onMouseLeave = vi.fn()
    const { container } = render(
      <AgentSprite
        agent={makeAgent()}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />,
    )
    const sprite = container.querySelector('[data-agent-sprite]')
    expect(sprite).toBeTruthy()

    await user.hover(sprite!)
    expect(onMouseEnter).toHaveBeenCalledOnce()
    await user.unhover(sprite!)
    expect(onMouseLeave).toHaveBeenCalledOnce()
  })

  it('renders a non-interactive ghost sprite for mirrored tasks', () => {
    const { container } = render(
      <AgentSprite
        ghost
        agent={makeAgent({ source: 'task', parentId: 'parent-1' })}
      />,
    )
    const sprite = container.querySelector('[data-agent-sprite]')
    expect(sprite?.tagName).toBe('DIV')
    expect(screen.getByTitle('Mirrored from the parent agent')).toBeInTheDocument()
  })
})
