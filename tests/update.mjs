import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { chromium, webkit } from 'playwright'

const root = new URL('../', import.meta.url)
let upgraded = false
const oldPage = `<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><h1>One name. One spy.</h1><input id="round-state" aria-label="Active round"><script>navigator.serviceWorker.register('./sw.js');</script>`
const oldWorker = `self.addEventListener('install',event=>event.waitUntil(caches.open('spy-pass-v3').then(cache=>Promise.all(['./','./index.html'].map(path=>cache.put(path,new Response(${JSON.stringify(oldPage)},{headers:{'Content-Type':'text/html'}})))))));self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));self.addEventListener('fetch',event=>event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached=>cached||fetch(event.request))));`
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', ttf: 'font/ttf', png: 'image/png', svg: 'image/svg+xml', webmanifest: 'application/manifest+json' }
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname.replace(/^\/spygame-pwa\//, '') || 'index.html'
    const content = !upgraded && path === 'sw.js' ? oldWorker : !upgraded && path === 'index.html' ? oldPage : await readFile(new URL(path, root))
    res.writeHead(200, { 'Content-Type': types[path.split('.').at(-1)] || 'text/plain', 'Cache-Control': 'no-store' })
    res.end(content)
  } catch { res.writeHead(404); res.end() }
})
server.listen(0, '127.0.0.1')
await new Promise((resolve) => server.once('listening', resolve))
const browser = await (process.env.BROWSER === 'webkit' ? webkit : chromium).launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 280, height: 653 } })
  const url = `http://127.0.0.1:${server.address().port}/spygame-pwa/`
  await page.goto(url)
  await page.evaluate(() => navigator.serviceWorker.ready)
  await page.waitForFunction(() => !!navigator.serviceWorker.controller)
  await page.reload()
  await page.getByRole('heading', { name: 'One name. One spy.' }).waitFor()
  await page.locator('#round-state').fill('Do not interrupt this round')
  await page.evaluate(() => { window.previousController = navigator.serviceWorker.controller })
  upgraded = true
  await page.evaluate(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update() })
  await page.waitForFunction(() => navigator.serviceWorker.controller !== window.previousController)
  assert.equal(await page.locator('#round-state').inputValue(), 'Do not interrupt this round', 'worker upgrade preserves the open game')
  await page.reload()
  assert.equal(await page.getByRole('heading', { name: 'One name. One spy.' }).count(), 0, 'old cache no longer restores the removed headline')
  await page.locator('.masthead #install-open').waitFor()
  for (const width of [280, 320, 390]) {
    await page.setViewportSize({ width, height: 653 })
    for (const textSize of ['100%', '150%', '200%']) {
      await page.evaluate((size) => { document.documentElement.style.fontSize = size }, textSize)
      const bounds = await page.evaluate(() => {
        const rect = (id) => { const { left, right, top, height } = document.querySelector(id).getBoundingClientRect(); return { left, right, top, height } }
        return { install: rect('#install-open'), help: rect('#help-button'), brand: rect('.wordmark'), overflow: document.documentElement.scrollWidth > innerWidth }
      })
      assert.ok(bounds.install.right + 7 <= bounds.help.left, `${width}/${textSize}: Install and Help have separate columns with a gap`)
      assert.ok(bounds.brand.right <= bounds.install.left, `${width}/${textSize}: logo must not overlap Install`)
      assert.ok(Math.abs(bounds.install.top + bounds.install.height / 2 - bounds.help.top - bounds.help.height / 2) < 1, 'actions sit side by side')
      assert.equal(bounds.overflow, false)
    }
  }
  await page.context().setOffline(true)
  await page.reload()
  await page.getByRole('heading', { name: 'Party game · 3+ players' }).waitFor()
  assert.equal(await page.getByRole('heading', { name: 'One name. One spy.' }).count(), 0)
  console.log('PASS upgrade from old cache, preserve active round, remove old headline online/offline, side-by-side banner at 280/320/390px and 100/150/200% text')
} finally {
  await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
