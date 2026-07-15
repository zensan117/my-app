import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTransactionInput } from '../transactionForm.js';

test('expense entries become negative amounts with the selected category', () => {
  const result = normalizeTransactionInput({
    title: '食費',
    amount: '1500',
    entryType: 'expense',
  });

  assert.deepEqual(result, {
    title: '食費',
    amount: -1500,
    entryType: 'expense',
  });
});

test('income entries become positive amounts with the selected category', () => {
  const result = normalizeTransactionInput({
    title: '給与',
    amount: '3000',
    entryType: 'income',
  });

  assert.deepEqual(result, {
    title: '給与',
    amount: 3000,
    entryType: 'income',
  });
});
