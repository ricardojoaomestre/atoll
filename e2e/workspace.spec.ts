import { test, expect } from '@playwright/test'
import { mockAppApi, sampleAgent, sampleWorkspace } from './mock-api'

test.describe('workspace page', () => {
  test('shows not found for missing islands', async ({ page }) => {
    await mockAppApi(page, { workspaces: [], workspaceById: { missing: null } })
    await page.goto('/workspace/missing')

    await expect(page.getByText('Island not found.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back' })).toBeVisible()
  })

  test('shows island details and empty agent prompt', async ({ page }) => {
    const workspace = sampleWorkspace({
      name: 'Lagoon Lab',
      path: '/Users/dev/lagoon',
    })
    await mockAppApi(page, {
      workspaces: [workspace],
      workspaceById: { [workspace.id]: workspace },
    })
    await page.goto(`/workspace/${workspace.id}`)

    await expect(page.getByRole('heading', { name: 'Lagoon Lab' })).toBeVisible()
    await expect(page.getByText('/Users/dev/lagoon')).toBeVisible()
    await expect(
      page.getByText('An empty island... spawn your first agent!'),
    ).toBeVisible()
    await expect(page.getByRole('button', { name: '+ SPAWN AGENT' })).toBeEnabled()
  })

  test('navigates from the map to a workspace', async ({ page }) => {
    const workspace = sampleWorkspace({
      agents: [sampleAgent({ name: 'Echo', status: 'working' })],
    })
    await mockAppApi(page, {
      workspaces: [workspace],
      workspaceById: { [workspace.id]: workspace },
    })
    await page.goto('/')
    await page.getByRole('link', { name: /Demo Island/i }).click()

    await expect(page).toHaveURL(`/workspace/${workspace.id}`)
    await expect(page.getByRole('link', { name: '◀ MAP' })).toBeVisible()
  })
})
