import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Game, parseNames, randomIndex, playerColor, COLORS } from '../game.js'

function fixture(draws = [0, 1]) {
  let time = 0, id = 0
  const pending = new Map(), callbacks = []
  const game = new Game({ random: () => draws.shift() ?? 0, now: () => time, schedule: (callback, delay) => { pending.set(++id, { callback, at: time + delay }); callbacks.push(callback); return id }, cancel: (key) => pending.delete(key) })
  const tick = (milliseconds) => {
    time += milliseconds
    for (const [key, task] of [...pending]) if (task.at <= time) { pending.delete(key); task.callback() }
  }
  return { game, tick, pending, callbacks }
}

test('trims, splits pasted lists, caps names, and allows duplicates', () => {
  assert.deepEqual(parseNames('  Moon,\n  Paris\r\nMoon, ,  '), ['Moon', 'Paris', 'Moon'])
  assert.equal([...parseNames('🎈'.repeat(60))[0]].length, 40)
  assert.equal(parseNames('x'.repeat(90))[0].length, 40)
})

test('requires three players and picks secret and spy independently', () => {
  const { game } = fixture([2, 2])
  assert.equal(game.deal(), false)
  game.addNames('Moon,Paris')
  assert.equal(game.deal(), false)
  game.addNames('Telescope')
  assert.equal(game.deal(), true)
  assert.equal(game.secret, 'Telescope')
  assert.equal(game.spyIndex, 2, 'the spy may enter the picked secret')
  assert.equal(game.addNames('Illegal mid-round addition'), 0)
  game.removeName(0)
  assert.equal(game.names.length, 3)
})

test('timed reveals advance exactly once and enforce the hand-off lock', () => {
  const { game, tick, pending, callbacks } = fixture()
  game.addNames('A,B,C'); game.deal()
  assert.equal(game.showCard(), false)
  tick(700); assert.equal(game.showCard(), true)
  const stale = callbacks[0]
  tick(3499); assert.equal(game.revealed, true)
  tick(1); assert.equal(game.revealed, false); assert.equal(game.current, 1)
  assert.equal(game.showCard(), false)
  tick(699); assert.equal(game.showCard(), false)
  tick(1); assert.equal(game.showCard(), true)
  stale(); assert.equal(game.current, 1, 'a stale callback cannot advance a new player')
  game.advance(); assert.equal(game.current, 2); assert.equal(pending.size, 0)
  game.advance(); assert.equal(game.current, 2, 'double taps cannot skip players')
  tick(700); game.showCard(); tick(3500)
  assert.equal(game.phase, 'done')
  game.revealAnswer(); assert.equal(game.showAnswer, false, 'last-player tap cannot reveal the answer')
  tick(700); game.revealAnswer(); assert.equal(game.showAnswer, true)
})

test('quit cancels the timer, preserves names, and masks setup', () => {
  const { game, tick, callbacks, pending } = fixture()
  game.addNames('A,B,C'); game.toggleNames(); assert.equal(game.showNames, true)
  game.deal(); tick(700); game.showCard(); game.quit()
  assert.equal(pending.size, 0); callbacks[0]()
  assert.equal(game.phase, 'setup'); assert.equal(game.revealed, false)
  assert.equal(game.showNames, false); assert.equal(game.secret, '')
  assert.deepEqual(game.names, ['A', 'B', 'C'])
})

test('backgrounding hides a reveal without skipping an unseen player', () => {
  const { game, tick } = fixture()
  game.addNames('A,B,C'); game.deal(); tick(700); game.showCard()
  game.conceal(); assert.equal(game.current, 1); assert.equal(game.revealed, false)
  game.conceal(); assert.equal(game.current, 1)
  tick(10000); assert.equal(game.current, 1)
})

test('deal again re-randomizes both choices and clears the previous answer', () => {
  const { game, tick } = fixture([0, 1, 2, 0])
  game.addNames('A,B,C'); game.deal()
  for (let i = 0; i < 3; i++) { tick(700); game.showCard(); game.advance() }
  tick(700); game.revealAnswer(); assert.equal(game.showAnswer, true)
  game.deal(); assert.equal(game.secret, 'C'); assert.equal(game.spyIndex, 0)
  assert.equal(game.current, 0); assert.equal(game.showAnswer, false); assert.equal(game.revealed, false)
})

test('cryptographic selection rejects the biased tail instead of applying modulo blindly', () => {
  const values = [0xffffffff, 7]
  let count = 0
  assert.equal(randomIndex(3, (buffer) => { buffer[0] = values[count++] }), 1)
  assert.equal(count, 2)
  assert.throws(() => randomIndex(0), RangeError)
})

test('player colors cycle independently of roles', () => {
  assert.deepEqual(playerColor(0), ['Coral', '#FF7A66'])
  assert.deepEqual(playerColor(12), playerColor(0))
  assert.equal(COLORS.length, 12)
  assert.ok(COLORS.every(([, color]) => color !== '#E2402B'))
})
