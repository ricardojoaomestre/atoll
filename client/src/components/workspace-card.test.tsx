import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { WorkspaceCard } from './workspace-card'
import { makeAgent, makeWorkspace } from '../test/fixtures'

function renderCard(workspace = makeWorkspace()) {
  return render(
    <MemoryRouter>
      <WorkspaceCard workspace={workspace} />
    </MemoryRouter>,
  )
}

describe('WorkspaceCard', () => {
  it('links to the workspace route and shows the name', () => {
    renderCard(makeWorkspace({ name: 'Harbor' }))
    const link = screen.getByRole('link', { name: /Harbor/i })
    expect(link).toHaveAttribute('href', '/workspace/ws-1')
  })

  it('shows attention badge when agents need input', () => {
    renderCard(
      makeWorkspace({
        agents: [
          makeAgent({ status: 'needs-question' }),
          makeAgent({ id: 'agent-2', status: 'needs-permission' }),
        ],
      }),
    )
    expect(screen.getByRole('link', { name: '? 2 WONDERING' })).toHaveAttribute(
      'href',
      '/workspace/ws-1?mate=agent-1',
    )
  })
})
