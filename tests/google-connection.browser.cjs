// Run against `npm run dev -- --port 4175`. PLAYWRIGHT_MODULE can point to an existing installation.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright')
const assert = require('node:assert/strict')

;(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}) })
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    // All Google calls simulated: no personal account or real data is touched.
    await page.route('https://www.googleapis.com/**', route => route.fulfill({ json: route.request().url().includes('/upload/') ? { id: 'test-file' } : { files: [] } }))
    await page.route('https://tasks.googleapis.com/**', route => route.fulfill({ json: { items: [], id: 'default', title: 'Test' } }))
    await page.addInitScript(() => {
      window.authCalls = 0
      window.google = { accounts: { oauth2: {
        initTokenClient: config => ({ requestAccessToken: () => { window.authCalls++; config.callback({ access_token: 'fake-token', expires_in: 3600 }) } }),
        revoke: () => {},
      } } }
    })
    const base = process.env.GOOGLE_UI_URL || 'http://127.0.0.1:4175'
    const bar = page.getByRole('region', { name: 'Connexion Google', exact: true })
    const dialog = page.getByRole('dialog', { name: 'Ta connexion Google' })
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      for (const route of ['/hub', '/', '/presence', '/karate', '/projets', '/parametres']) {
        await page.goto(base + route)
        await bar.getByRole('button', { name: 'Connecter Google', exact: true }).waitFor()
        assert.equal(await dialog.isVisible(), false)
        assert.equal(await page.getByRole('button', { name: 'Connecter Google', exact: true }).count(), 1)
        assert.ok(Math.abs((await bar.boundingBox()).y) < 1, `${route} initial position at ${width}`)
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
        assert.ok(Math.abs((await bar.boundingBox()).y) < 1, `${route} sticky position at ${width}`)
        const bounds = await bar.boundingBox()
        assert.ok(bounds.x >= 0 && bounds.width <= width, `${route} bar overflow at ${width}`)
      }
    }
    await page.goto(base + '/hub')
    await bar.getByRole('button', { name: 'Options de connexion Google' }).click()
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Plus tard' }).click()
    await page.reload()
    await dialog.waitFor()
    assert.equal(await page.evaluate(() => window.authCalls), 0, 'startup must not open Google automatically')
    await page.keyboard.press('Escape')
    await page.getByRole('link', { name: 'Assistant', exact: true }).click()
    assert.equal(await dialog.isVisible(), false, 'navigation must not reopen startup invitation')
    await bar.getByRole('button', { name: 'Options de connexion Google' }).click()
    await dialog.getByRole('checkbox').uncheck()
    await dialog.getByRole('button', { name: 'Plus tard' }).click()
    await page.reload()
    await bar.waitFor()
    assert.equal(await dialog.isVisible(), false, 'disabled startup preference persists')
    await page.context().setOffline(true)
    await bar.getByText('Hors ligne', { exact: true }).waitFor()
    assert.equal(await bar.getByRole('button', { name: 'Connecter Google', exact: true }).isDisabled(), true)
    await page.context().setOffline(false)
    await page.goto(base + '/hub')
    await bar.getByRole('button', { name: 'Options de connexion Google' }).click()
    await dialog.getByRole('button', { name: 'Connecter Google', exact: true }).click()
    await bar.getByText('Connecté', { exact: true }).waitFor()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await page.evaluate(() => window.authCalls), 1)
    await page.getByRole('link', { name: 'Assistant', exact: true }).click()
    await bar.getByText('Connecté', { exact: true }).waitFor()
    // An access denial is a synchronization error, not a loss of the Google session.
    await page.route('https://www.googleapis.com/**', route => route.fulfill({ status: 403, json: { error: 'denied' } }))
    await bar.getByRole('button', { name: 'Synchroniser', exact: true }).click()
    await bar.getByText('Synchronisation à vérifier', { exact: true }).waitFor()
    await page.route('https://www.googleapis.com/**', route => route.fulfill({ status: 401, json: { error: 'expired' } }))
    await bar.getByRole('button', { name: 'Synchroniser', exact: true }).click()
    await bar.getByRole('button', { name: 'Connecter Google', exact: true }).waitFor()
    await page.goto(base + '/hub')
    await page.evaluate(() => {
      window.google.accounts.oauth2.initTokenClient = config => ({ requestAccessToken: () => config.callback({ access_token: 'short-token', expires_in: 1 }) })
    })
    await page.unroute('https://www.googleapis.com/**')
    await page.route('https://www.googleapis.com/**', route => route.fulfill({ json: route.request().url().includes('/upload/') ? { id: 'test-file' } : { files: [] } }))
    await bar.getByRole('button', { name: 'Connecter Google', exact: true }).click()
    await bar.getByText('Connecté', { exact: true }).waitFor()
    await bar.getByText('Non connecté', { exact: true }).waitFor()
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(base + '/projets')
    if (process.env.GOOGLE_UI_SCREENSHOT) await page.screenshot({ path: process.env.GOOGLE_UI_SCREENSHOT })
    assert.deepEqual(errors, [])
    console.log('Google UI verified: 6 routes × 3 widths, sticky bar, opt-in startup, no automatic OAuth, offline, connection, 403/401 and expiry.')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
