"use client";

import React, { useEffect, useState } from 'react';
import { ReceiptText, Trash2, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

export default function TransaksiPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    const existing = localStorage.getItem('ruang_harta_transactions');
    if (existing) {
      setTransactions(JSON.parse(existing));
    }
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Yakin ingin menghapus transaksi ini?')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(updated);
      localStorage.setItem('ruang_harta_transactions', JSON.stringify(updated));
    }
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) setExpandedId(null);
    else setExpandedId(id);
  };

  const handleEditClick = (tx: any) => {
    setEditingId(tx.id);
    setEditForm({ ...tx });
    setExpandedId(null); // Tutup rincian jika sedang edit
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSaveEdit = () => {
    const updatedAmount = Number(editForm.amount);
    const updated = transactions.map(t => 
      t.id === editingId ? { ...t, ...editForm, amount: isNaN(updatedAmount) ? 0 : updatedAmount } : t
    );
    setTransactions(updated);
    localStorage.setItem('ruang_harta_transactions', JSON.stringify(updated));
    setEditingId(null);
    setEditForm({});
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>Transaksi</h1>
          <p className="text-muted">Kelola semua riwayat pengeluaran dan pemasukan Anda.</p>
        </div>
      </header>

      <section className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: 'var(--space-6)', borderBottom: '1px solid var(--color-border)' }} className="flex items-center gap-2">
          <ReceiptText size={20} color="var(--color-accent)" />
          <h3>Daftar Transaksi</h3>
        </div>
        
        {transactions.length === 0 ? (
          <div style={{ padding: 'var(--space-12) var(--space-6)', textAlign: 'center' }}>
            <p className="text-muted">Belum ada transaksi tersimpan. Coba scan dokumen keuangan Anda!</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-paper-3)', borderBottom: '1px solid var(--color-border)' }}>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem' }}>Tanggal</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem' }}>Deskripsi</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem' }}>Tipe / Kategori</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem' }}>Total (Rp)</th>
                  <th style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 500, fontSize: '0.875rem', width: '100px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <React.Fragment key={tx.id}>
                    <tr style={{ borderBottom: expandedId === tx.id ? 'none' : '1px solid var(--color-border)', backgroundColor: editingId === tx.id ? 'var(--color-paper-3)' : 'transparent' }}>
                      
                      {/* TANGGAL */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)', fontSize: '0.875rem' }}>
                        {editingId === tx.id ? (
                          <input 
                            type="date" 
                            className="input-field" 
                            style={{ padding: '6px', fontSize: '0.875rem' }} 
                            value={editForm.date} 
                            onChange={e => setEditForm({ ...editForm, date: e.target.value })} 
                          />
                        ) : (
                          tx.date
                        )}
                      </td>

                      {/* DESKRIPSI */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        {editingId === tx.id ? (
                          <input 
                            type="text" 
                            className="input-field" 
                            style={{ padding: '6px', fontSize: '0.875rem', width: '100%' }} 
                            value={editForm.storeName || ''} 
                            onChange={e => setEditForm({ ...editForm, storeName: e.target.value })} 
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{tx.storeName}</span>
                            {tx.items && tx.items.length > 0 && (
                              <button 
                                onClick={() => toggleExpand(tx.id)}
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-accent)' }}
                              >
                                {expandedId === tx.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                              </button>
                            )}
                          </div>
                        )}
                        {!editingId && tx.items && tx.items.length > 0 && (
                          <div className="text-xs text-muted" style={{ marginTop: '4px' }}>
                            {tx.items.length} item(s)
                          </div>
                        )}
                      </td>

                      {/* TIPE & KATEGORI */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        {editingId === tx.id ? (
                          <div className="flex flex-col gap-2">
                            <select 
                              className="input-field" 
                              style={{ padding: '6px', fontSize: '0.875rem' }}
                              value={editForm.type || 'expense'}
                              onChange={e => setEditForm({ ...editForm, type: e.target.value })}
                            >
                              <option value="income">Pemasukan</option>
                              <option value="expense">Pengeluaran</option>
                              <option value="debt">Hutang / Cicilan</option>
                            </select>
                            {editForm.type === 'income' && (
                              <select 
                                className="input-field" 
                                style={{ padding: '6px', fontSize: '0.875rem' }}
                                value={editForm.category || 'Lainnya'}
                                onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                              >
                                <option value="Gaji">💼 Gaji</option>
                                <option value="Transfer Masuk">💸 Transfer Masuk</option>
                                <option value="Freelance">💻 Freelance</option>
                                <option value="Investasi/Bunga">📈 Investasi/Bunga</option>
                                <option value="Lainnya">📦 Lainnya</option>
                              </select>
                            )}
                          </div>
                        ) : (
                          <span className={`badge ${tx.type === 'expense' ? 'badge-danger' : tx.type === 'income' ? 'badge-success' : ''}`} style={tx.type === 'debt' ? { backgroundColor: 'var(--color-paper-3)', border: '1px solid var(--color-border)', color: 'var(--color-text)' } : {}}>
                            {tx.type === 'expense' ? 'Pengeluaran' : tx.type === 'income' ? `Pemasukan${tx.category ? ` (${tx.category})` : ''}` : 'Hutang / Cicilan'}
                          </span>
                        )}
                      </td>

                      {/* TOTAL */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)', fontWeight: 600 }}>
                        {editingId === tx.id ? (
                          <input 
                            type="number" 
                            className="input-field" 
                            style={{ padding: '6px', fontSize: '0.875rem', width: '120px' }} 
                            value={editForm.amount || 0} 
                            onChange={e => setEditForm({ ...editForm, amount: e.target.value })} 
                          />
                        ) : (
                          `Rp ${tx.amount.toLocaleString('id-ID')}`
                        )}
                      </td>

                      {/* AKSI */}
                      <td style={{ padding: 'var(--space-4) var(--space-6)' }}>
                        {editingId === tx.id ? (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={handleSaveEdit}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-success)' }}
                              title="Simpan"
                            >
                              <Check size={18} />
                            </button>
                            <button 
                              onClick={handleCancelEdit}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-faint)' }}
                              title="Batal"
                            >
                              <X size={18} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleEditClick(tx)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-accent)' }}
                              title="Edit"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => handleDelete(tx.id)}
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-danger)' }}
                              title="Hapus"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    
                    {/* Dropdown Items Row */}
                    {expandedId === tx.id && tx.items && tx.items.length > 0 && !editingId && (
                      <tr style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-paper-3)' }}>
                        <td colSpan={5} style={{ padding: 'var(--space-4) var(--space-6)' }}>
                          <div style={{ padding: 'var(--space-4)', background: 'var(--color-paper)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                            <h4 className="text-sm font-medium mb-3" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>Rincian Pembelian</h4>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                              {tx.items.map((item: any, idx: number) => (
                                <li key={idx} className="flex justify-between items-center" style={{ padding: '4px 0', fontSize: '0.875rem' }}>
                                  <span className="text-muted">{item.name}</span>
                                  <span className="font-medium">Rp {item.price.toLocaleString('id-ID')}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

    </div>
  );
}
