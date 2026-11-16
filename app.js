import { Game, playerColor } from './game.js'

const $ = (id) => document.getElementById(id)
const game = new Game({ onChange: render })
let lastPhase = '', lastPlayer = -1, unlockTimer = null
let installEvent = null
const standalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
let installed = standalone()
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const vibrate = (pattern) => { if (!reducedMotion()) navigator.vibrate?.(pattern) }

function updateSetup() {
  const count = game.names.length
  $('entry-label').textContent = `Player ${count + 1}, add your name`
  $('player-count').replaceChildren(Object.assign(document.createElement('strong'), { textContent: String(count) }), document.createTextNode(` ${count === 1 ? 'player' : 'players'}`))
  $('toggle-names').textContent = game.showNames ? 'Hide names' : 'Show names'
  $('toggle-names').setAttribute('aria-pressed', String(game.showNames))
  $('toggle-names').disabled = count === 0
  $('empty-state').hidden = count > 0
  const rows = game.names.map((name, index) => {
    const row = document.createElement('li')
    row.className = 'name-row'
    const number = document.createElement('span')
    number.className = 'name-index'
    number.textContent = String(index + 1).padStart(2, '0')
    number.setAttribute('aria-label', `Player ${index + 1}`)
    const value = document.createElement('span')
    value.className = `name-value${game.showNames ? '' : ' masked'}`
    value.textContent = game.showNames ? name : '••••••'
    if (!game.showNames) value.setAttribute('aria-label', 'Name hidden')
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.className = 'remove-name'
    remove.textContent = '×'
    remove.setAttribute('aria-label', `Remove Player ${index + 1}`)
    remove.addEventListener('click', () => {
      game.removeName(index)
      $('entry-status').textContent = `Player ${index + 1} removed. ${game.names.length} players remaining.`
      const next = $('name-list').children[Math.min(index, game.names.length - 1)]?.querySelector('button')
      ;(next || $('name-input')).focus({ preventScroll: true })
    })
    row.append(number, value, remove)
    return row
  })
  $('name-list').replaceChildren(...rows)
  $('deal-button').disabled = count < 3
  $('deal-button').textContent = count < 3 ? 'Need 3 players to start' : `Deal to ${count} players`
}

function unlock() {
  clearTimeout(unlockTimer)
  const locked = performance.now() < game.lockedUntil
  $('card').disabled = locked
  $('show-card-button').disabled = locked
  $('answer-button').disabled = locked
  if (locked) unlockTimer = setTimeout(unlock, game.lockedUntil - performance.now() + 10)
}

function updateDeal() {
  const player = game.current + 1
  const [colorName, color] = playerColor(game.current)
  const spy = game.current === game.spyIndex
  $('deal').style.setProperty('--player', color)
  $('player-position').textContent = `Player ${player} of ${game.names.length}`
  $('deal-heading').replaceChildren()
  $('card-center').replaceChildren()
  $('countdown').hidden = !game.revealed
  // A new element restarts the bar on every reveal, never on a hidden hand-off.
  $('countdown').replaceChildren(document.createElement('span'))
  $('show-card-button').hidden = game.revealed
  if (game.revealed) {
    if (spy) {
      $('deal-heading').append('You are the ', Object.assign(document.createElement('span'), { className: 'accent', textContent: 'spy.' }))
    } else $('deal-heading').textContent = 'Remember this.'
    $('card-top').textContent = `${spy ? 'Your role' : 'Secret name'} · Player ${player} · ${colorName}`
    const secret = document.createElement('span')
    secret.className = `secret${spy ? ' spy' : [...game.secret].length > 18 ? ' long' : ''}`
    secret.textContent = spy ? 'SPY' : game.secret
    $('card-center').append(secret)
    $('card-bottom').textContent = 'For your eyes only'
    $('card').setAttribute('aria-label', `${spy ? 'You are the spy' : `The secret name is ${game.secret}`}. Tap to hide your card.`)
    $('deal-footnote').textContent = 'Hides by itself. Tap the card to hide it now.'
  } else {
    $('deal-heading').textContent = player === 1 ? 'Player 1 starts.' : 'Pass the phone to the next person.'
    $('card-top').textContent = `Player ${player} · ${colorName} · Not seen yet`
    $('card-center').append(
      Object.assign(document.createElement('span'), { className: 'player-label', textContent: 'Player' }),
      Object.assign(document.createElement('span'), { className: 'player-number', textContent: String(player) }),
      Object.assign(document.createElement('span'), { className: 'redaction', textContent: 'Card hidden' }),
    )
    $('card-bottom').textContent = 'Shows for 3.5 seconds'
    $('card').setAttribute('aria-label', `Show my card. Player ${player}, ${colorName}.`)
    $('show-card-subtitle').textContent = `Player ${player} · ${colorName} has not seen it yet`
    $('deal-footnote').textContent = `Only player ${player} should look at the screen.`
  }
  unlock()
}

function updateDone() {
  $('done-eyebrow').textContent = `All ${game.names.length} players have seen their card`
  $('answer-panel').hidden = !game.showAnswer
  $('answer-button').hidden = game.showAnswer
  $('spy-answer').textContent = game.showAnswer ? `Player ${game.spyIndex + 1}` : ''
  $('name-answer').textContent = game.showAnswer ? game.secret : ''
  unlock()
}

function render() {
  const changedPhase = lastPhase !== game.phase
  const changedPlayer = lastPlayer !== game.current
  for (const phase of ['setup', 'deal', 'done']) $(phase).hidden = phase !== game.phase
  document.body.dataset.phase = game.phase
  $('help-button').hidden = game.phase === 'deal'
  $('install-open').hidden = installed || game.phase === 'deal'
  document.querySelector('.site-footer').hidden = game.phase === 'deal'
  if (game.phase === 'setup') updateSetup()
  if (game.phase === 'deal') updateDeal()
  else {
    // Remove secrets from the inactive card, not merely from the painted screen.
    $('card-center').replaceChildren()
    $('card').setAttribute('aria-label', 'Show my card')
    $('countdown').hidden = true
  }
  if (game.phase === 'done') updateDone()
  else { $('spy-answer').textContent = ''; $('name-answer').textContent = ''; $('answer-panel').hidden = true }
  if (game.phase !== 'setup') $('name-list').replaceChildren()
  if (changedPhase && lastPhase || game.phase === 'deal' && changedPlayer) {
    $(`${game.phase}-heading`).focus({ preventScroll: true })
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  lastPhase = game.phase
  lastPlayer = game.current
}

function add(input) {
  const added = game.addNames(input)
  if (!added) { $('entry-status').textContent = 'Type a name first.'; $('name-input').focus(); return }
  $('name-input').value = ''
  $('entry-status').textContent = added === 1 ? 'Name added and hidden. Pass the phone to the next player.' : `${added} names added and hidden.`
  $('name-input').focus({ preventScroll: true })
  $('name-list').scrollTop = $('name-list').scrollHeight
}

$('name-form').addEventListener('submit', (event) => { event.preventDefault(); add($('name-input').value) })
$('name-input').addEventListener('paste', (event) => {
  const text = event.clipboardData?.getData('text') || ''
  if (/[\r\n,]/.test(text)) { event.preventDefault(); add(text) }
})
$('toggle-names').addEventListener('click', () => game.toggleNames())
function deal() { $('install-dialog').close(); $('entry-status').textContent = ''; $('name-input').value = ''; game.deal() }
$('deal-button').addEventListener('click', deal)
$('again-button').addEventListener('click', deal)
function reveal() { if (game.showCard()) { vibrate(12); $('card').focus({ preventScroll: true }) } }
$('show-card-button').addEventListener('click', reveal)
$('card').addEventListener('click', () => { if (game.revealed) { game.advance(); vibrate(7) } else reveal() })
$('quit-button').addEventListener('click', () => game.quit())
$('change-button').addEventListener('click', () => game.quit())
$('answer-button').addEventListener('click', () => { game.revealAnswer(); if (game.showAnswer) { $('answer-heading').tabIndex = -1; $('answer-heading').focus() } })
document.querySelector('.wordmark').addEventListener('click', (event) => { event.preventDefault(); game.quit() })
$('help-button').addEventListener('click', () => { game.conceal(); $('help-dialog').showModal() })

// Cover both tab switching and bfcache/app switching. No visible secret is restored.
document.addEventListener('visibilitychange', () => { if (document.hidden) { game.conceal(); $('name-input').value = '' } })
window.addEventListener('pagehide', () => { game.conceal(); $('name-input').value = '' })
window.addEventListener('pageshow', (event) => { if (event.persisted) game.conceal() })

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelectorAll('.dialog-close').forEach((button) => button.addEventListener('click', () => dialog.close()))
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect()
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close()
  })
}

function showInstall() {
  if (installed || game.phase === 'deal' || $('help-dialog').open || $('install-dialog').open) return
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  $('install-confirm').hidden = !installEvent
  $('install-instructions').replaceChildren()
  if (!installEvent) {
    const text = ios
      ? 'On iPhone or iPad: open this page in Safari, tap Share, then Add to Home Screen. Turn on “Open as Web App” if offered, then tap Add.'
      : 'Open your browser’s menu and choose “Install app” or “Add to Home Screen”. On desktop, look for the install icon in the address bar. You can also keep playing right here.'
    $('install-instructions').textContent = text
  }
  $('install-dialog').showModal()
}
$('install-open').addEventListener('click', () => showInstall())
$('install-confirm').addEventListener('click', async () => {
  if (!installEvent) return
  const prompt = installEvent
  installEvent = null
  $('install-dialog').close()
  try { await prompt.prompt(); await prompt.userChoice } catch { /* Browser dismissal leaves the web game available. */ }
})
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault()
  installEvent = event
  if ($('install-dialog').open) { $('install-confirm').hidden = false; $('install-instructions').textContent = '' }
})
window.addEventListener('appinstalled', () => { installed = true; $('install-dialog').close(); $('install-open').hidden = true })

render()
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register('./sw.js')
      await navigator.serviceWorker.ready
      $('offline-status').textContent = 'Ready for offline play'
    } catch { $('offline-status').textContent = 'Offline setup unavailable. Keep this page open to play.' }
  })
}
