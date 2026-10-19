import { test, expect } from '@playwright/test'
import { mockAppApi, sampleWorkspace } from './mock-api'

test.describe('map page', () => {
  test('shows empty state when there are no workspaces', async ({ page }) => {
    await mockAppApi(page, { workspaces: [] })
    await page.goto('/')

    await expect(page.getByRole('heading', { name: 'ATOLL' })).toBeVisible()
    await expect(page.getByText('EMPTY SEAS')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ NEW WORKSPACE' }).first()).toBeVisible()
  })

  test('lists workspace islands', async ({ page }) => {
    const workspace = sampleWorkspace({ name: 'Harbor Reef' })
    await mockAppApi(page, { workspaces: [workspace] })
    await page.goto('/')

    await expect(page.getByRole('link', { name: /Harbor Reef/i })).toBeVisible()
    await expect(page.getByText('/tmp/demo')).toBeVisible()
  })
})
