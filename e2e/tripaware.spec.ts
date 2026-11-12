import { expect, test } from '@playwright/test'

test('searches destinations and opens an official advisory', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Know Before\s*You Go\./)
  await page.getByRole('searchbox', { name: 'Search for a destination' }).fill('Japan')
  await page.getByRole('button', { name: 'Search destinations' }).click()
  await expect(page).toHaveURL(/destinations\?q=Japan/)
  await page.getByRole('link', { name: /Japan.*Level/i }).click()
  await expect(page.getByRole('heading', { name: 'Japan', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Read the official advisory' })).toHaveAttribute('href', /^https:\/\/travel\.state\.gov\//)
})

test('filters the map and supports theme switching', async ({ page }) => {
  await page.goto('/map')
  await page.getByRole('button', { name: 'Toggle light and dark theme' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByRole('searchbox', { name: 'Find a country on the map' }).fill('Japan')
  await expect(page.getByRole('link', { name: /^Japan · Level/ })).toBeVisible()
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeEnabled()
  await page.getByRole('button', { name: 'Reset map view' }).click()
  await expect(page.getByRole('button', { name: 'Zoom out' })).toBeDisabled()
})

test('country advisory is available without JavaScript', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL })
  const page = await context.newPage()
  await page.goto('/destinations/japan/')
  await expect(page.getByRole('heading', { name: 'Japan', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Official advisory', exact: true })).toBeVisible()
  await context.close()
})

