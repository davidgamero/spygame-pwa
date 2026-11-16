export const REVEAL_DURATION = 3500
export const HANDOFF_LOCK = 700
export const MIN_PLAYERS = 3
export const MAX_NAME_LENGTH = 40
export const COLORS = Object.freeze([
  ['Coral', '#FF7A66'], ['Sky', '#5DB7FF'], ['Lime', '#B5E04A'],
  ['Violet', '#C58CFF'], ['Amber', '#FFB938'], ['Teal', '#3CC9C4'],
  ['Pink', '#FF8CCF'], ['Sand', '#E6D3A3'], ['Mint', '#4FD18B'],
  ['Indigo', '#8C8CFF'], ['Orange', '#FF9A4A'], ['White', '#F2F2F2'],
])

export const playerColor = (index) => COLORS[index % COLORS.length]

// Rejection sampling avoids modulo bias, including for non-power-of-two groups.
export function randomIndex(length, fill = (buffer) => crypto.getRandomValues(buffer)) {
  if (!Number.isSafeInteger(length) || length < 1 || length > 0x100000000) throw new RangeError('Invalid player count')
  const buffer = new Uint32Array(1)
  const ceiling = Math.floor(0x100000000 / length) * length
  do { fill(buffer) } while (buffer[0] >= ceiling)
  return buffer[0] % length
}

export function parseNames(input) {
  return String(input).split(/[\r\n,]+/).map((name) => [...name.trim()].slice(0, MAX_NAME_LENGTH).join('')).filter(Boolean)
}

export class Game {
  constructor({ random = randomIndex, now = () => performance.now(), schedule = (callback, delay) => setTimeout(callback, delay), cancel = (timer) => clearTimeout(timer), onChange = () => {} } = {}) {
    this.random = random
    this.now = now
    this.schedule = schedule
    this.cancel = cancel
    this.onChange = onChange
    this.phase = 'setup'
    this.names = []
    this.showNames = false
    this.secret = ''
    this.spyIndex = 0
    this.current = 0
    this.revealed = false
    this.showAnswer = false
    this.lockedUntil = 0
    this.timer = null
    this.generation = 0
  }

  notify() { this.onChange(this) }
  cancelTimer() {
    if (this.timer !== null) this.cancel(this.timer)
    this.timer = null
    this.generation++
  }

  addNames(input) {
    if (this.phase !== 'setup') return 0
    const names = parseNames(input)
    this.names.push(...names)
    if (names.length) { this.showNames = false; this.notify() }
    return names.length
  }

  removeName(index) {
    if (this.phase !== 'setup' || !Number.isInteger(index) || index < 0 || index >= this.names.length) return
    this.names.splice(index, 1)
    this.notify()
  }

  toggleNames() {
    if (this.phase !== 'setup') return
    this.showNames = !this.showNames
    this.notify()
  }

  deal() {
    if (this.phase === 'deal' || this.names.length < MIN_PLAYERS) return false
    this.cancelTimer()
    // Independent draws: the spy may have entered the selected name.
    this.secret = this.names[this.random(this.names.length)]
    this.spyIndex = this.random(this.names.length)
    this.phase = 'deal'
    this.current = 0
    this.revealed = false
    this.showNames = false
    this.showAnswer = false
    this.lockedUntil = this.now() + HANDOFF_LOCK
    this.notify()
    return true
  }

  showCard() {
    if (this.phase !== 'deal' || this.revealed || this.now() < this.lockedUntil) return false
    this.cancelTimer()
    this.revealed = true
    const generation = this.generation
    this.timer = this.schedule(() => {
      if (this.generation === generation) this.advance()
    }, REVEAL_DURATION)
    this.notify()
    return true
  }

  advance() {
    if (this.phase !== 'deal' || !this.revealed) return false
    this.cancelTimer()
    this.revealed = false
    this.lockedUntil = this.now() + HANDOFF_LOCK
    if (this.current + 1 < this.names.length) this.current++
    else this.phase = 'done'
    this.notify()
    return true
  }

  revealAnswer() {
    if (this.phase !== 'done' || this.now() < this.lockedUntil) return
    this.showAnswer = true
    this.notify()
  }

  quit() {
    this.cancelTimer()
    this.phase = 'setup'
    this.revealed = false
    this.showNames = false
    this.showAnswer = false
    this.secret = ''
    this.current = 0
    this.notify()
  }

  // A backgrounded reveal counts as seen; returning never exposes the secret.
  conceal() {
    if (this.phase === 'deal' && this.revealed) this.advance()
    if (this.showNames || this.showAnswer) {
      this.showNames = false
      this.showAnswer = false
      this.notify()
    }
  }
}
