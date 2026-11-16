import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { resolve, extname, sep } from 'node:path'

const root = fileURLToPath(new URL('../', import.meta.url))
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf' }
export const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/spygame-pwa(?=\/)/, '')
    const file = resolve(root, `.${path.endsWith('/') ? `${path}index.html` : path}`)
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep) || /(?:node_modules|\.git)\//.test(path)) { res.writeHead(404); res.end(); return }
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' })
    res.end(body)
  } catch { res.writeHead(404); res.end('Not found') }
})
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(Number(process.env.PORT || 4173), '127.0.0.1', () => console.log(`Spy Pass: http://127.0.0.1:${server.address().port}/spygame-pwa/`))
