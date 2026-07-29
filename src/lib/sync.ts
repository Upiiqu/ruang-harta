export async function syncTransactionsToServer() {
  try {
    const existing = localStorage.getItem('ruang_harta_transactions');
    const txs = existing ? JSON.parse(existing) : [];
    const res = await fetch('/api/transactions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save-all', transactions: txs }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('❌ Sync gagal:', res.status, errData.error || errData);
    }
  } catch (err) {
    console.warn('Auto-sync failed (non-blocking):', err);
  }
}

export async function deleteTransactionFromServer(id: string) {
  try {
    await fetch('/api/transactions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', transactionId: id }),
    });
  } catch (err) {
    console.warn('Auto-delete sync failed (non-blocking):', err);
  }
}
