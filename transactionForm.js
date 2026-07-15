export function normalizeTransactionInput({ title, amount, entryType }) {
  const normalizedTitle = String(title || '').trim() || 'その他';
  const parsedAmount = Number(amount);
  const isIncome = entryType === 'income';
  const normalizedAmount = Number.isFinite(parsedAmount) && parsedAmount > 0 ? parsedAmount : 0;

  return {
    title: normalizedTitle,
    amount: isIncome ? normalizedAmount : -normalizedAmount,
    entryType: isIncome ? 'income' : 'expense',
  };
}
