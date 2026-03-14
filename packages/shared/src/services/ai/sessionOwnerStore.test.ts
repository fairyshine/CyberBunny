import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDefaultSessionOwnerStore,
  resetDefaultSessionOwnerStoreForTests,
  setDefaultSessionOwnerStore,
  zustandSessionOwnerStore,
} from './sessionOwnerStore';

test('default session owner store can be overridden and reset', () => {
  resetDefaultSessionOwnerStoreForTests();
  assert.equal(getDefaultSessionOwnerStore(), zustandSessionOwnerStore);

  const customStore = { ...zustandSessionOwnerStore };
  setDefaultSessionOwnerStore(customStore);
  assert.equal(getDefaultSessionOwnerStore(), customStore);

  resetDefaultSessionOwnerStoreForTests();
  assert.equal(getDefaultSessionOwnerStore(), zustandSessionOwnerStore);
});
