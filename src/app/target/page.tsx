"use client";

import React, { useEffect, useState } from 'react';
import { Target, Plus, CheckCircle2, Trash2, Upload, RefreshCw } from 'lucide-react';

export default function TargetPage() {
  const [targets, setTargets] = useState<any[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
  
  // New target form
  const [newTargetName, setNewTargetName] = useState("");
  const [newTargetAmount, setNewTargetAmount] = useState("");
  const [newTargetSaved, setNewTargetSaved] = useState("");

  const loadLocal = () => {
    const saved = localStorage.getItem('ruang_harta_targets');
    return saved ? JSON.parse(saved) : [];
  };

  const syncFromServer = async () => {
    try {
      const res = await fetch('/api/targets');
      const data = await res.json();
      if (data.targets) {
        const mapped = data.targets.map((t: any) => ({
          id: t.id,
          name: t.name,
          targetAmount: Number(t.target_amount),
          savedAmount: Number(t.saved_amount),
          createdAt: t.created_at,
        }));
        
        const local = loadLocal();
        const serverMap = new Map(mapped.map((t: any) => [t.id, t]));
        
        const unsynced: any[] = [];
        local.forEach((t: any) => {
          if (!serverMap.has(t.id) && t._localCreatedAt && (Date.now() - t._localCreatedAt < 3600000)) {
            serverMap.set(t.id, t);
            unsynced.push(t);
          }
        });
        
        const merged = Array.from(serverMap.values());
        
        const currentJson = JSON.stringify(local);
        const mergedJson = JSON.stringify(merged);
        if (currentJson !== mergedJson) {
          localStorage.setItem('ruang_harta_targets', JSON.stringify(merged));
          setTargets(merged);
        }

        if (unsynced.length > 0) {
          syncToServer(merged);
        }
      }
    } catch (err) {
      console.error('Target sync err:', err);
    }
  };

  useEffect(() => {
    setTargets(loadLocal());

    const updateBalance = () => {
      const existingTxs = localStorage.getItem('ruang_harta_transactions');
      if (existingTxs) {
        const txs = JSON.parse(existingTxs);
        let inc = 0, exp = 0, debt = 0;
        txs.forEach((t: any) => {
          if (t.type === 'income') inc += t.amount;
          else if (t.type === 'expense') exp += t.amount;
          else if (t.type === 'debt') debt += t.amount;
        });
        setTotalBalance(inc - exp - debt);
      }
    };

    updateBalance();
    syncFromServer();
    
    const interval = setInterval(() => {
      updateBalance();
      syncFromServer();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const syncToServer = async (current = targets) => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save-all', targets: current }),
      });
      const data = await res.json();
      if (data.success) {
        setSyncMsg(`Tersinkronisasi!`);
      } else {
        setSyncMsg('Gagal: ' + (data.error || 'unknown'));
      }
    } catch {
      setSyncMsg('Gagal menghubungi server.');
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(''), 4000);
  };

  const saveTargets = (updated: any[]) => {
    setTargets(updated);
    localStorage.setItem('ruang_harta_targets', JSON.stringify(updated));
    syncToServer(updated);
  };

  const handleSaveTarget = () => {
    if (!newTargetName || !newTargetAmount) return;
    
    const target = {
      id: crypto.randomUUID(),
      name: newTargetName,
      targetAmount: Number(newTargetAmount),
      savedAmount: Number(newTargetSaved) || 0,
      createdAt: new Date().toISOString(),
      _localCreatedAt: Date.now()
    };
    
    saveTargets([target, ...targets]);
    setShowAddModal(false);
    setNewTargetName("");
    setNewTargetAmount("");
    setNewTargetSaved("");
  };

  const handleDelete = (id: string) => {
    saveTargets(targets.filter(t => t.id !== id));
  };
  
  const addFunds = (id: string, amount: number) => {
    const updated = targets.map(t => {
      if (t.id === id) {
        return { ...t, savedAmount: Math.min(t.savedAmount + amount, t.targetAmount) };
      }
      return t;
    });
    saveTargets(updated);
  };

  const totalAllocated = targets.reduce((sum, t) => sum + t.savedAmount, 0);
  const unallocatedBalance = totalBalance - totalAllocated;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
            <Target size={28} color="var(--color-accent)" /> 
            Target & Tabungan
          </h1>
          <p className="text-muted">Alokasikan saldo nganggurmu ke tujuan finansial yang jelas.</p>
        </div>
        <div className="flex items-center gap-3">
          {syncMsg && (
            <span className="text-sm" style={{ color: syncMsg.includes('Gagal') ? 'var(--color-danger)' : 'var(--color-success)' }}>
              {syncMsg}
            </span>
          )}
          {syncing && <RefreshCw size={18} className="spin text-muted" />}
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Plus size={16} /> Buat Target Baru
          </button>
        </div>
      </header>

      {/* Saldo Summary */}
      <div className="glass-panel" style={{ marginBottom: 'var(--space-8)', padding: 'var(--space-6)', display: 'flex', gap: 'var(--space-8)', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)' }}>Total Saldo (Dari Transaksi)</p>
          <h2 style={{ color: totalBalance >= 0 ? 'var(--color-text)' : 'var(--color-danger)' }}>Rp {totalBalance.toLocaleString('id-ID')}</h2>
        </div>
        <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)' }}>Telah Dialokasikan</p>
          <h2 style={{ color: 'var(--color-accent)' }}>Rp {totalAllocated.toLocaleString('id-ID')}</h2>
        </div>
        <div style={{ width: '1px', background: 'var(--color-border)' }}></div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <p className="text-muted text-sm" style={{ marginBottom: 'var(--space-2)' }}>Sisa Uang Nganggur</p>
          <h2 style={{ color: unallocatedBalance >= 0 ? 'var(--color-success, #10b981)' : 'var(--color-danger)' }}>Rp {unallocatedBalance.toLocaleString('id-ID')}</h2>
        </div>
      </div>

      {/* Target Grid */}
      {targets.length === 0 ? (
        <div style={{ padding: 'var(--space-12)', textAlign: 'center' }} className="glass-panel">
          <p className="text-muted">Kamu belum memiliki target tabungan. Yuk mulai kumpulkan dana darurat atau wishlist-mu!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 'var(--space-6)' }}>
          {targets.map(target => {
            const percentage = Math.min(Math.round((target.savedAmount / target.targetAmount) * 100), 100);
            const isCompleted = percentage === 100;
            
            return (
              <div key={target.id} className="glass-panel" style={{ padding: 'var(--space-6)', position: 'relative' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isCompleted && <CheckCircle2 size={18} color="var(--color-success, #10b981)" />}
                    {target.name}
                  </h3>
                  <button onClick={() => handleDelete(target.id)} style={{ background: 'none', border: 'none', color: 'var(--color-text-faint)', cursor: 'pointer' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="text-sm text-muted">Terkumpul: <b style={{ color: 'var(--color-text)' }}>Rp {target.savedAmount.toLocaleString('id-ID')}</b></span>
                  <span className="text-sm text-muted">Target: Rp {target.targetAmount.toLocaleString('id-ID')}</span>
                </div>
                
                {/* Progress Bar */}
                <div style={{ width: '100%', height: '8px', background: 'var(--color-paper-3)', borderRadius: '4px', overflow: 'hidden', marginBottom: 'var(--space-4)' }}>
                  <div style={{ 
                    width: `${percentage}%`, 
                    height: '100%', 
                    background: isCompleted ? 'var(--color-success, #10b981)' : 'var(--color-accent)',
                    transition: 'width 0.5s ease'
                  }}></div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium" style={{ color: isCompleted ? 'var(--color-success, #10b981)' : 'var(--color-accent)' }}>
                    {percentage}% Tercapai
                  </span>
                  
                  {!isCompleted && (
                    <div className="flex gap-2">
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => addFunds(target.id, 50000)}>+50k</button>
                      <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }} onClick={() => addFunds(target.id, 100000)}>+100k</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--color-paper)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <h3>Buat Target Tabungan</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm text-muted">Nama Target (Mis: Beli Laptop)</label>
              <input type="text" className="input-field" value={newTargetName} onChange={e => setNewTargetName(e.target.value)} />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm text-muted">Nominal Target (Rp)</label>
              <input type="number" className="input-field" placeholder="10000000" value={newTargetAmount} onChange={e => setNewTargetAmount(e.target.value)} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="text-sm text-muted">Uang yang Sudah Terkumpul Saat Ini (Rp)</label>
              <input type="number" className="input-field" placeholder="0" value={newTargetSaved} onChange={e => setNewTargetSaved(e.target.value)} />
            </div>

            <div className="flex gap-2" style={{ marginTop: 'var(--space-4)' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setShowAddModal(false)}>Batal</button>
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSaveTarget}>Simpan</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
