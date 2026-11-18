import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword } from '../src/services/password.js';

test('gera hashes diferentes para a mesma senha por causa do salt', async () => {
  const first = await hashPassword('senha-segura');
  const second = await hashPassword('senha-segura');
  assert.notEqual(first, second);
  assert.equal(await verifyPassword('senha-segura', first), true);
  assert.equal(await verifyPassword('senha-incorreta', first), false);
});
