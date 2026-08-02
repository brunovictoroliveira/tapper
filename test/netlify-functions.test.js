import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import test from 'node:test'

test('todas as Netlify Functions carregam e exportam handler', async () => {
  const directory = new URL('../netlify/functions/', import.meta.url)
  const files = (await readdir(directory)).filter((file) => file.endsWith('.js'))
  assert.ok(files.length >= 9)
  for (const file of files) {
    const module = await import(new URL(file, directory))
    assert.equal(typeof module.handler, 'function', `${file} precisa exportar handler`)
  }
})
