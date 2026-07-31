"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, CreditCard, Sparkles, Plus, Camera, Wallet, X, Check, TrendingUp, TrendingDown, Activity, Eye, EyeOff, MessageSquare, CalendarDays } from 'lucide-react';
import { syncTransactionsToServer } from '@/lib/sync';

export default function Home() {
  const router = useRouter();
  const [chartData, setChartData] = useState<any[]>([]);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [insightText, setInsightText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanError, setScanError] = useState("");
  
  const [isScanningIncome, setIsScanningIncome] = useState(false);
  const [incomeResult, setIncomeResult] = useState<any>(null);
  const [incomeError, setIncomeError] = useState("");
  
  const [isScanningDebt, setIsScanningDebt] = useState(false);
  const [debtResult, setDebtResult] = useState<any>(null);
  const [debtError, setDebtError] = useState("");
  
  const [isScanningText, setIsScanningText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [textError, setTextError] = useState("");
  
  const [balanceInfo, setBalanceInfo] = useState({ total: 0, income: 0, expense: 0, debt: 0 });
  const [hideBalance, setHideBalance] = useState(false);
  
  const [userName, setUserName] = useState("");
  const [greeting, setGreeting] = useState("Dashboard");
  const [cycleText, setCycleText] = useState("");

  useEffect(() => {
    // Check saved hide balance preference
    const savedHide = localStorage.getItem('ruang_harta_hide_balance');
    if (savedHide === 'true') setHideBalance(true);

    // Get user name and set greeting
    const name = localStorage.getItem('ruang_harta_user_name') || "";
    setUserName(name);
    
    const hour = new Date().getHours();
    let timeGreeting = "Selamat Pagi";
    if (hour >= 11 && hour < 15) timeGreeting = "Selamat Siang";
    else if (hour >= 15 && hour < 18) timeGreeting = "Selamat Sore";
    else if (hour >= 18) timeGreeting = "Selamat Malam";
    
    setGreeting(`${timeGreeting}${name ? `, ${name}` : ''}`);

    const calculateBalance = (txs: any[]) => {
      const cycleDateStr = localStorage.getItem('ruang_harta_cycle_date') || '1';
      const cycleDate = parseInt(cycleDateStr) || 1;
      
      const now = new Date();
      const currentDay = now.getDate();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let start, end;
      
      if (currentDay >= cycleDate) {
        start = new Date(currentYear, currentMonth, cycleDate);
        end = new Date(currentYear, currentMonth + 1, cycleDate - 1);
      } else {
        start = new Date(currentYear, currentMonth - 1, cycleDate);
        end = new Date(currentYear, currentMonth, cycleDate - 1);
      }
      
      // Update UI Text for Cycle
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
      if (cycleDate === 1) {
        setCycleText(`Bulan Ini (${monthNames[currentMonth]} ${currentYear})`);
      } else {
        setCycleText(`Siklus: ${start.getDate()} ${monthNames[start.getMonth()]} - ${end.getDate()} ${monthNames[end.getMonth()]}`);
      }

      let totalInc = 0, totalExp = 0, totalDebt = 0;
      let cycleInc = 0, cycleExp = 0, cycleDebt = 0;
      
      // Start of day and End of day to be safe with timezones
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);

      txs.forEach((t: any) => {
        const amt = Number(t.amount) || 0;
        const txDate = new Date(t.date);
        const inCycle = txDate >= start && txDate <= end;
        
        if (t.type === 'income') {
          totalInc += amt;
          if (inCycle) cycleInc += amt;
        }
        else if (t.type === 'expense') {
          totalExp += amt;
          if (inCycle) cycleExp += amt;
        }
        else if (t.type === 'debt') {
          totalDebt += amt;
          if (inCycle) cycleDebt += amt;
        }
      });
      
      setBalanceInfo({ total: totalInc - totalExp - totalDebt, income: cycleInc, expense: cycleExp, debt: cycleDebt });

      const newChartData = [];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1); // Fix JS Date bug: set to 1st day before changing month
        d.setMonth(d.getMonth() - i);
        const targetMonth = d.getMonth();
        const targetYear = d.getFullYear();
        
        const endOfMonth = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
        
        let cumulativeInc = 0, cumulativeExp = 0, cumulativeDebt = 0;
        
        txs.forEach((t: any) => {
           const txDate = new Date(t.date);
           if (txDate <= endOfMonth) {
              const amt = Number(t.amount) || 0;
              if (t.type === 'income') cumulativeInc += amt;
              else if (t.type === 'expense') cumulativeExp += amt;
              else if (t.type === 'debt') cumulativeDebt += amt;
           }
        });
        
        newChartData.push({
           name: monthNames[targetMonth],
           balance: cumulativeInc - cumulativeExp - cumulativeDebt
        });
      }
      setChartData(newChartData);
    };

    const loadLocalTransactions = () => {
      const existing = localStorage.getItem('ruang_harta_transactions');
      if (existing) {
        const txs = JSON.parse(existing);
        calculateBalance(txs);
        return txs;
      }
      return [];
    };

    const localTxs = loadLocalTransactions();

    const syncFromServer = async () => {
      try {
        const res = await fetch('/api/transactions/sync');
        const data = await res.json();
        const serverTxs = (data.success && data.transactions) ? data.transactions : [];
        const localTxs = loadLocalTransactions() || [];

        // Server is the single source of truth.
        // Build merged list: start from server, add local-only items.
        const serverMap = new Map<string, any>();
        serverTxs.forEach((tx: any) => {
          serverMap.set(tx.id, {
            id: tx.id,
            type: tx.type,
            amount: tx.amount,
            category: tx.category,
            description: tx.description,
            date: tx.date || new Date().toISOString().split('T')[0],
            storeName: tx.store_name,
            items: tx.items,
          });
        });

        // Find local-only transactions (not yet on server) to push
        const unsynced: any[] = [];
        localTxs.forEach((tx: any) => {
          if (tx.id && !serverMap.has(tx.id)) {
            // Only push if it was created locally less than 1 hour ago
            const isRecent = tx._localCreatedAt && (Date.now() - tx._localCreatedAt < 3600000);
            if (isRecent) {
              unsynced.push(tx);
              serverMap.set(tx.id, tx); // include in merged for now
            }
          }
        });

        const merged = Array.from(serverMap.values());
        merged.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Always update localStorage with server truth + local unsynced
        const currentJson = JSON.stringify(localTxs);
        const mergedJson = JSON.stringify(merged);
        if (currentJson !== mergedJson) {
          localStorage.setItem('ruang_harta_transactions', JSON.stringify(merged));
          calculateBalance(merged);
        }

        // Push unsynced local transactions to server
        if (unsynced.length > 0) {
          await fetch('/api/transactions/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'save-all', transactions: unsynced }),
          });
        }
      } catch (err) {
        console.error('Sync err:', err);
      }
    };

    syncFromServer();
    const interval = setInterval(syncFromServer, 5000);
    return () => clearInterval(interval);
  }, []);

  const toggleHideBalance = () => {
    const nextState = !hideBalance;
    setHideBalance(nextState);
    localStorage.setItem('ruang_harta_hide_balance', String(nextState));
  };

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsScanning(true);
    setScanResult(null);
    setScanError("");

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        body: formData
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses struk");
      
      setScanResult(result.data);
    } catch (err: any) {
      setScanError(err.message);
    } finally {
      setIsScanning(false);
    }
    
    // Reset file input
    e.target.value = '';
  };

  const handleSaveTransaction = () => {
    if (!scanResult) return;
    
    // Get existing
    const existing = localStorage.getItem('ruang_harta_transactions');
    let transactions = existing ? JSON.parse(existing) : [];
    
    // Add new
    const newTx = {
      id: crypto.randomUUID(),
      date: scanResult.date || new Date().toISOString().split('T')[0],
      storeName: scanResult.storeName || 'Toko Tidak Diketahui',
      amount: scanResult.totalAmount || 0,
      category: scanResult.category || 'Umum',
      items: scanResult.items || [],
      type: 'expense',
      _localCreatedAt: Date.now()
    };
    
    transactions.unshift(newTx);
    localStorage.setItem('ruang_harta_transactions', JSON.stringify(transactions));
    
    setScanResult(null);
    syncTransactionsToServer();
    router.push('/transaksi');
  };

  const handleScanIncome = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsScanningIncome(true);
    setIncomeResult(null);
    setIncomeError("");

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch('/api/scan-income', {
        method: 'POST',
        body: formData
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses gambar pemasukan");
      
      setIncomeResult(result.data);
    } catch (err: any) {
      setIncomeError(err.message);
    } finally {
      setIsScanningIncome(false);
    }
    
    e.target.value = '';
  };

  const handleSaveIncomeTransaction = () => {
    if (!incomeResult || !incomeResult.incomes) return;
    
    const selectedItems = incomeResult.incomes.filter((item: any) => item.selected);
    if (selectedItems.length === 0) return;
    
    const existing = localStorage.getItem('ruang_harta_transactions');
    let transactions = existing ? JSON.parse(existing) : [];
    
    const newTxs = selectedItems.map((item: any, idx: number) => ({
      id: crypto.randomUUID(),
      date: item.date || new Date().toISOString().split('T')[0],
      storeName: item.sourceName || 'Pemasukan Tidak Diketahui',
      amount: item.totalAmount || 0,
      category: item.category || 'Transfer Masuk',
      items: [],
      type: 'income',
      _localCreatedAt: Date.now()
    }));
    
    transactions = [...newTxs, ...transactions];
    localStorage.setItem('ruang_harta_transactions', JSON.stringify(transactions));
    
    setIncomeResult(null);
    syncTransactionsToServer();
    router.push('/transaksi');
  };

  const handleScanDebt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsScanningDebt(true);
    setDebtResult(null);
    setDebtError("");

    const formData = new FormData();
    formData.append('image', file);
    formData.append('currentIncome', balanceInfo.income.toString());
    formData.append('currentDebt', balanceInfo.debt.toString());

    try {
      const res = await fetch('/api/scan-debt', {
        method: 'POST',
        body: formData
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses gambar tagihan");
      
      setDebtResult(result.data);
    } catch (err: any) {
      setDebtError(err.message);
    } finally {
      setIsScanningDebt(false);
    }
    
    e.target.value = '';
  };

  const handleSaveDebtTransaction = () => {
    if (!debtResult) return;
    
    const existing = localStorage.getItem('ruang_harta_transactions');
    let transactions = existing ? JSON.parse(existing) : [];
    
    const newTx = {
      id: crypto.randomUUID(),
      date: debtResult.date || new Date().toISOString().split('T')[0],
      storeName: debtResult.creditorName || 'Tagihan Hutang',
      amount: debtResult.installmentAmount || 0,
      category: debtResult.category || 'Cicilan',
      items: [],
      type: 'debt',
      _localCreatedAt: Date.now()
    };
    
    transactions.unshift(newTx);
    localStorage.setItem('ruang_harta_transactions', JSON.stringify(transactions));
    
    setDebtResult(null);
    syncTransactionsToServer();
    router.push('/transaksi');
  };

  const handleScanText = async () => {
    if (!textInput.trim()) return;
    
    setIsScanningText(true);
    setTextError("");

    try {
      const res = await fetch('/api/scan-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textInput })
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Gagal memproses teks");
      
      // Treat the returned result data based on its type and open the corresponding modal
      setTextInput(""); // clear input
      
      if (result.data.type === 'expense') {
        setScanResult(result.data);
      } else if (result.data.type === 'income') {
        setIncomeResult(result.data);
      } else if (result.data.type === 'debt') {
        setDebtResult(result.data);
      }
      
    } catch (err: any) {
      setTextError(err.message);
    } finally {
      setIsScanningText(false);
    }
  };

  const triggerAIAnalysis = async () => {
    setIsAnalyzing(true);
    setShowAIInsights(true);
    setInsightText("Sedang menganalisis kebiasaan finansial Anda...");
    
    try {
      const existing = localStorage.getItem('ruang_harta_transactions');
      const txs = existing ? JSON.parse(existing) : [];

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txs),
      });
      
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || "Gagal");
      
      const responseText = result.insight;
      setInsightText("");
      
      let i = 0;
      const interval = setInterval(() => {
        setInsightText(responseText.slice(0, i));
        i++;
        if (i > responseText.length) {
          clearInterval(interval);
          setIsAnalyzing(false);
        }
      }, 20);
    } catch (err) {
      setInsightText("Maaf, terjadi kesalahan atau API Key belum diatur.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Workbench Header */}
      <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-2)' }}>{greeting}</h1>
          <p className="text-muted">Pantau dan kelola kekayaan Anda secara cerdas.</p>
          {cycleText && (
            <div className="badge badge-secondary" style={{ marginTop: 'var(--space-2)' }}>
              <CalendarDays size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              {cycleText}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <button className="btn btn-secondary flex items-center gap-2" onClick={() => setIsScanningText(true)} disabled={isScanning || isScanningIncome || isScanningDebt}>
            <MessageSquare size={16} />
            Teks
          </button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <Camera size={16} />
            Struk
            <input type="file" accept="image/*" hidden onChange={handleScan} disabled={isScanning || isScanningIncome || isScanningDebt} />
          </label>
          <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
            <Plus size={16} />
            Pemasukan
            <input type="file" accept="image/*,application/pdf" hidden onChange={handleScanIncome} disabled={isScanning || isScanningIncome || isScanningDebt} />
          </label>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', backgroundColor: 'var(--color-danger)', color: 'var(--color-paper)', border: 'none' }}>
            <CreditCard size={16} />
            Tagihan
            <input type="file" accept="image/*,application/pdf" hidden onChange={handleScanDebt} disabled={isScanning || isScanningIncome || isScanningDebt} />
          </label>
        </div>
      </header>

      {/* Metrics Grid */}
      <div className="summary-cards-grid">
        <SummaryCard 
          title="Total Saldo" 
          amount={`Rp ${balanceInfo.total.toLocaleString('id-ID')}`} 
          trend="Dinikmati Real-time" 
          isPositive={true} 
          icon={<Wallet size={18} color="var(--color-accent)" />} 
          hideBalance={hideBalance}
          onToggleHideBalance={toggleHideBalance}
        />
        <SummaryCard 
          title="Pemasukan Bulan Ini" 
          amount={`Rp ${balanceInfo.income.toLocaleString('id-ID')}`} 
          trend="Dari AI Scan" 
          isPositive={true} 
          icon={<ArrowUpRight size={18} color="var(--color-accent)" />} 
          hideBalance={hideBalance}
          onToggleHideBalance={toggleHideBalance}
        />
        <SummaryCard 
          title="Pengeluaran Bulan Ini" 
          amount={`Rp ${balanceInfo.expense.toLocaleString('id-ID')}`} 
          trend="Dari Struk" 
          isPositive={true} 
          icon={<ArrowDownRight size={18} color="var(--color-danger)" />} 
          hideBalance={hideBalance}
          onToggleHideBalance={toggleHideBalance}
        />
        <SummaryCard 
          title="Total Hutang (Bulan Ini)" 
          amount={`Rp ${balanceInfo.debt.toLocaleString('id-ID')}`} 
          trend={balanceInfo.debt > (balanceInfo.income * 0.3) ? "Bahaya (>30%)" : balanceInfo.debt > 0 ? "Aman (<30%)" : "0% (Bagus)"} 
          isPositive={balanceInfo.debt <= (balanceInfo.income * 0.3)} 
          icon={<CreditCard size={18} color="var(--color-text-muted)" />} 
          hideBalance={hideBalance}
          onToggleHideBalance={toggleHideBalance}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--space-6)' }}>
        
        {/* Chart Panel */}
        <section className="glass-panel">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
            <h3>Proyeksi & Riwayat Saldo</h3>
            <select className="input-field" style={{ width: 'auto', height: '32px' }} aria-label="Pilih periode waktu">
              <option>6 Bulan Terakhir</option>
              <option>Tahun Ini</option>
            </select>
          </div>
          
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart)" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="var(--color-chart)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-faint)" tick={{ fill: 'var(--color-text-faint)', fontSize: 12 }} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--color-text-faint)" tick={{ fill: 'var(--color-text-faint)', fontSize: 12 }} tickLine={false} axisLine={false} tickFormatter={(val) => `Rp${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--color-paper-3)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontSize: '14px' }}
                  itemStyle={{ color: 'var(--color-chart)', fontWeight: 500 }}
                  labelStyle={{ color: 'var(--color-text-muted)', marginBottom: '4px' }}
                />
                <Area type="monotone" dataKey="balance" stroke="var(--color-chart)" strokeWidth={2} fillOpacity={1} fill="url(#colorBalance)" activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--color-text)' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Market Snapshot Panel */}
        <MarketSnapshot />
      </div>

      {/* Text Input Modal Overlay */}
      {isScanningText && !scanResult && !incomeResult && !debtResult && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--color-paper)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            <div className="flex items-center justify-between">
              <h3>Input Cepat (Teks)</h3>
              <button className="btn btn-secondary" style={{ padding: '0 var(--space-2)' }} onClick={() => { setIsScanningText(false); setTextError(""); }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted">Ketik transaksi Anda seperti mengobrol. AI akan otomatis mengkategorikannya.</p>
              <textarea 
                className="input-field" 
                rows={3}
                placeholder="Contoh: Beli kopi kenangan 25 ribu pakai gopay"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                style={{ resize: 'none' }}
              />
              {textError && (
                <p style={{ color: 'var(--color-danger)', fontSize: '0.875rem' }}>{textError}</p>
              )}
            </div>
            
            <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-2)' }}>
              <p className="text-xs text-muted flex items-center gap-1"><Sparkles size={12} color="var(--color-accent)" /> ✨ Diproses oleh AI</p>
              <button className="btn btn-primary" onClick={handleScanText} disabled={!textInput.trim()}>
                Proses
              </button>
            </div>

          </div>
        </div>
      )}

        {/* Scan Modal Overlay */}
      {(isScanning || scanResult || scanError) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', backgroundColor: 'var(--color-paper)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            <div className="flex items-center justify-between">
              <h3>{isScanning ? 'Menganalisis Struk...' : scanError ? 'Gagal Memproses' : 'Hasil Scan Struk'}</h3>
              {!isScanning && (
                <button className="btn btn-secondary" style={{ padding: '0 var(--space-2)' }} onClick={() => { setScanResult(null); setScanError(""); }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {isScanning ? (
              <div className="flex items-center justify-center flex-col gap-4" style={{ padding: 'var(--space-8) 0' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p className="text-muted text-sm flex items-center gap-2"><Sparkles size={14} color="var(--color-accent)" /> ✨ Diproses oleh AI</p>
              </div>
            ) : scanError ? (
              <div className="flex flex-col gap-4">
                <p style={{ color: 'var(--color-danger)' }}>{scanError}</p>
                <button className="btn btn-secondary" onClick={() => setScanError("")}>Tutup</button>
              </div>
            ) : scanResult ? (
              <div className="flex flex-col gap-4">
                <div style={{ backgroundColor: 'var(--color-paper-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                    <span className="text-sm font-medium text-muted">Nama Toko</span>
                    <span className="font-medium">{scanResult.storeName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                    <span className="text-sm font-medium text-muted">Tanggal</span>
                    <input 
                      type="date" 
                      className="input-field" 
                      style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '0.875rem' }}
                      value={scanResult.date || ''} 
                      onChange={(e) => setScanResult({...scanResult, date: e.target.value})} 
                    />
                  </div>
                  
                  <div className="text-sm font-medium text-muted" style={{ marginBottom: 'var(--space-2)' }}>Item:</div>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
                    {scanResult.items && scanResult.items.length > 0 ? (
                      scanResult.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-sm" style={{ padding: 'var(--space-1) 0', borderBottom: '1px dashed var(--color-border)' }}>
                          <span>{item.name}</span>
                          <span>Rp {item.price?.toLocaleString('id-ID')}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted">Tidak ada item terdeteksi.</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-4)', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                    <span className="font-medium">Total Harga</span>
                    <h3 style={{ color: 'var(--color-accent)' }}>Rp {scanResult.totalAmount?.toLocaleString('id-ID') || 0}</h3>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted flex items-center gap-1"><Sparkles size={12} color="var(--color-accent)" /> ✨ Diproses oleh AI</p>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setScanResult(null)}>Batal</button>
                    <button className="btn btn-primary" onClick={handleSaveTransaction}>
                      <Check size={16} /> Simpan
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Scan Income Modal Overlay */}
      {(isScanningIncome || incomeResult || incomeError) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)', padding: 'var(--space-4)' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--color-paper)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            
            <div className="flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 'var(--space-3)' }}>
              <div>
                <h3 style={{ fontSize: '1.125rem' }}>{isScanningIncome ? 'Membaca Pemasukan...' : incomeError ? 'Gagal Memproses' : 'Hasil Pemindai Pemasukan AI'}</h3>
                {!isScanningIncome && incomeResult?.incomes && (
                  <p className="text-xs text-muted">Ditemukan {incomeResult.incomes.length} transaksi pemasukan. Centang dan sesuaikan kategori sebelum disimpan.</p>
                )}
              </div>
              {!isScanningIncome && (
                <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => { setIncomeResult(null); setIncomeError(""); }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {isScanningIncome ? (
              <div className="flex items-center justify-center flex-col gap-4" style={{ padding: 'var(--space-8) 0' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p className="text-muted text-sm flex items-center gap-2"><Sparkles size={14} color="var(--color-accent)" /> ✨ Membaca Bukti Pemasukan / Mutasi Rekening...</p>
              </div>
            ) : incomeError ? (
              <div className="flex flex-col gap-4">
                <p style={{ color: 'var(--color-danger)' }}>{incomeError}</p>
                <button className="btn btn-secondary" onClick={() => setIncomeError("")}>Tutup</button>
              </div>
            ) : incomeResult && incomeResult.incomes ? (
              <div className="flex flex-col gap-4">
                
                {/* AI Advice Banner */}
                {(() => {
                  const totalSelected = incomeResult.incomes.filter((i: any) => i.selected).reduce((acc: number, curr: any) => acc + (Number(curr.totalAmount) || 0), 0);
                  if (totalSelected > 0) {
                    const saveTarget = totalSelected * 0.2; // 20% recommendation
                    return (
                      <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-accent)' }}>
                        <p className="text-sm font-medium flex items-start gap-2" style={{ color: 'var(--color-accent)', lineHeight: 1.5 }}>
                          <Sparkles size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span>
                            <strong>Saran AI:</strong> Ada baiknya Anda menyisihkan 20% dari pemasukan ini (sekitar <strong>Rp {saveTarget.toLocaleString('id-ID')}</strong>) ke Tabungan/Investasi untuk mencapai target finansial Anda.
                          </span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Select all & summary bar */}
                <div className="flex items-center justify-between" style={{ backgroundColor: 'var(--color-paper-2)', padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input 
                      type="checkbox" 
                      checked={incomeResult.incomes.length > 0 && incomeResult.incomes.every((i: any) => i.selected)}
                      onChange={() => {
                        const allSel = incomeResult.incomes.every((i: any) => i.selected);
                        setIncomeResult({
                          ...incomeResult,
                          incomes: incomeResult.incomes.map((i: any) => ({ ...i, selected: !allSel }))
                        });
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <span>Pilih Semua ({incomeResult.incomes.length})</span>
                  </label>
                  <span className="text-xs text-muted">{incomeResult.incomes.filter((i: any) => i.selected).length} transaksi dipilih</span>
                </div>

                {/* Items List */}
                <div className="flex flex-col gap-3" style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
                  {incomeResult.incomes.length === 0 ? (
                    <p className="text-muted text-sm text-center" style={{ padding: 'var(--space-6) 0' }}>Tidak ada transaksi pemasukan yang terdeteksi.</p>
                  ) : (
                    incomeResult.incomes.map((item: any, idx: number) => (
                      <div key={idx} style={{ backgroundColor: item.selected ? 'var(--color-paper-2)' : 'var(--color-paper-3)', opacity: item.selected ? 1 : 0.6, padding: 'var(--space-3)', borderRadius: 'var(--radius-md)', border: item.selected ? '1px solid var(--color-accent)' : '1px solid var(--color-border)', transition: 'all 0.2s' }}>
                        <div className="flex items-start gap-3">
                          <input 
                            type="checkbox" 
                            checked={!!item.selected} 
                            onChange={() => {
                              const updated = [...incomeResult.incomes];
                              updated[idx].selected = !updated[idx].selected;
                              setIncomeResult({ ...incomeResult, incomes: updated });
                            }}
                            style={{ marginTop: '6px', cursor: 'pointer', width: '18px', height: '18px' }}
                          />
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                            <div className="grid-2-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                              <div>
                                <label className="text-xs text-muted font-medium block" style={{ marginBottom: '2px' }}>Sumber / Deskripsi</label>
                                <input 
                                  type="text"
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                                  value={item.sourceName || ''}
                                  onChange={(e) => {
                                    const updated = [...incomeResult.incomes];
                                    updated[idx].sourceName = e.target.value;
                                    setIncomeResult({ ...incomeResult, incomes: updated });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted font-medium block" style={{ marginBottom: '2px' }}>Kategori Pemasukan</label>
                                <select
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '0.875rem', cursor: 'pointer' }}
                                  value={item.category || 'Transfer Masuk'}
                                  onChange={(e) => {
                                    const updated = [...incomeResult.incomes];
                                    updated[idx].category = e.target.value;
                                    setIncomeResult({ ...incomeResult, incomes: updated });
                                  }}
                                >
                                  <option value="Gaji">💼 Gaji</option>
                                  <option value="Transfer Masuk">💸 Transfer Masuk</option>
                                  <option value="Freelance">💻 Freelance</option>
                                  <option value="Investasi/Bunga">📈 Investasi / Bunga</option>
                                  <option value="Lainnya">📦 Lainnya</option>
                                </select>
                              </div>
                            </div>

                            <div className="grid-2-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)' }}>
                              <div>
                                <label className="text-xs text-muted font-medium block" style={{ marginBottom: '2px' }}>Tanggal</label>
                                <input 
                                  type="date"
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '0.875rem' }}
                                  value={item.date || ''}
                                  onChange={(e) => {
                                    const updated = [...incomeResult.incomes];
                                    updated[idx].date = e.target.value;
                                    setIncomeResult({ ...incomeResult, incomes: updated });
                                  }}
                                />
                              </div>
                              <div>
                                <label className="text-xs text-muted font-medium block" style={{ marginBottom: '2px' }}>Nominal (Rp)</label>
                                <input 
                                  type="number"
                                  className="input-field"
                                  style={{ padding: '4px 8px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-success, #10b981)' }}
                                  value={item.totalAmount || 0}
                                  onChange={(e) => {
                                    const updated = [...incomeResult.incomes];
                                    updated[idx].totalAmount = Number(e.target.value) || 0;
                                    setIncomeResult({ ...incomeResult, incomes: updated });
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Total selected summary */}
                <div className="flex items-center justify-between" style={{ borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-3)' }}>
                  <div>
                    <span className="text-xs text-muted block">Total Dipilih</span>
                    <h3 style={{ color: 'var(--color-success, #10b981)' }}>
                      Rp {(incomeResult.incomes?.filter((i: any) => i.selected).reduce((acc: number, curr: any) => acc + (Number(curr.totalAmount) || 0), 0) || 0).toLocaleString('id-ID')}
                    </h3>
                  </div>
                  
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setIncomeResult(null)}>Batal</button>
                    <button 
                      className="btn btn-primary" 
                      disabled={incomeResult.incomes?.filter((i: any) => i.selected).length === 0}
                      onClick={handleSaveIncomeTransaction}
                    >
                      <Check size={16} /> Simpan ({incomeResult.incomes?.filter((i: any) => i.selected).length}) Pemasukan
                    </button>
                  </div>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* Scan Debt Modal Overlay */}
      {(isScanningDebt || debtResult || debtError) && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-panel" style={{ width: '90%', maxWidth: '400px', backgroundColor: 'var(--color-paper)', position: 'relative', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', border: debtResult ? (debtResult.isSafe ? '2px solid var(--color-success, #10b981)' : '2px solid var(--color-danger, #ef4444)') : '' }}>
            
            <div className="flex items-center justify-between">
              <h3>{isScanningDebt ? 'Menganalisis Tagihan...' : debtError ? 'Gagal Memproses' : 'Hasil Pemindai Hutang AI'}</h3>
              {!isScanningDebt && (
                <button className="btn btn-secondary" style={{ padding: '0 var(--space-2)' }} onClick={() => { setDebtResult(null); setDebtError(""); }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {isScanningDebt ? (
              <div className="flex items-center justify-center flex-col gap-4" style={{ padding: 'var(--space-8) 0' }}>
                <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-danger)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                <p className="text-muted text-sm flex items-center gap-2"><Sparkles size={14} color="var(--color-accent)" /> ✨ Menilai Risiko Finansial...</p>
              </div>
            ) : debtError ? (
              <div className="flex flex-col gap-4">
                <p style={{ color: 'var(--color-danger)' }}>{debtError}</p>
                <button className="btn btn-secondary" onClick={() => setDebtError("")}>Tutup</button>
              </div>
            ) : debtResult ? (
              <div className="flex flex-col gap-4">
                
                {/* AI Advice Banner */}
                <div style={{ backgroundColor: debtResult.isSafe ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: debtResult.isSafe ? '1px solid var(--color-success, #10b981)' : '1px solid var(--color-danger, #ef4444)' }}>
                  <p className="text-sm font-medium" style={{ color: debtResult.isSafe ? 'var(--color-success, #10b981)' : 'var(--color-danger, #ef4444)', lineHeight: 1.5 }}>
                    "{debtResult.aiAdvice}"
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--color-paper-2)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-2)' }}>
                    <span className="text-sm font-medium text-muted">Kreditur / Tagihan</span>
                    <span className="font-medium text-right">{debtResult.creditorName || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                    <span className="text-sm font-medium text-muted">Tanggal Jatuh Tempo</span>
                    <input 
                      type="date" 
                      className="input-field" 
                      style={{ width: 'auto', height: '28px', padding: '0 8px', fontSize: '0.875rem' }}
                      value={debtResult.date || ''} 
                      onChange={(e) => setDebtResult({...debtResult, date: e.target.value})} 
                    />
                  </div>
                  
                  <div className="flex items-center justify-between" style={{ marginTop: 'var(--space-4)', borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-2)' }}>
                    <span className="font-medium">Cicilan per Bulan</span>
                    <h3 style={{ color: 'var(--color-danger, #ef4444)' }}>Rp {debtResult.installmentAmount?.toLocaleString('id-ID') || 0}</h3>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted flex items-center gap-1"><Sparkles size={12} color="var(--color-accent)" /> ✨ Diproses oleh AI</p>
                  <div className="flex gap-2">
                    <button className="btn btn-secondary" onClick={() => setDebtResult(null)}>Batal</button>
                    <button className="btn btn-primary" style={{ backgroundColor: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={handleSaveDebtTransaction}>
                      <Check size={16} /> Simpan Tagihan
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

          </div>
        </div>
      )}

      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        
        @media (max-width: 900px) {
          .glass-panel { padding: var(--space-4); }
          .flex-items-center { flex-direction: column; align-items: stretch; gap: var(--space-4); }
          header.flex { flex-direction: column; align-items: flex-start; gap: var(--space-4); }
          header .flex { width: 100%; justify-content: space-between; }
          .grid-2-1 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ 
  title, 
  amount, 
  trend, 
  isPositive, 
  icon,
  hideBalance,
  onToggleHideBalance
}: { 
  title: string, 
  amount: string, 
  trend: string, 
  isPositive: boolean | null, 
  icon: React.ReactNode,
  hideBalance?: boolean,
  onToggleHideBalance?: () => void
}) {
  return (
    <div className="glass-panel" style={{ padding: 'var(--space-4)' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
        <span className="text-muted text-sm font-medium">{title}</span>
        <div className="flex items-center gap-2">
          {onToggleHideBalance && (
            <button 
              onClick={onToggleHideBalance}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--color-text-muted)', padding: '4px', borderRadius: '4px' }}
              title={hideBalance ? "Tampilkan Nominal Saldo" : "Sembunyikan Nominal Saldo"}
              aria-label={hideBalance ? "Tampilkan Nominal Saldo" : "Sembunyikan Nominal Saldo"}
            >
              {hideBalance ? <EyeOff size={16} color="var(--color-accent)" /> : <Eye size={16} />}
            </button>
          )}
          <div style={{ padding: 'var(--space-2)', backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)' }}>
            {icon}
          </div>
        </div>
      </div>
      <h2 style={{ marginBottom: 'var(--space-2)', letterSpacing: hideBalance ? '1px' : 'normal' }}>
        {hideBalance ? 'Rp ••••••••' : amount}
      </h2>
      
      {isPositive !== null && (
        <div className="flex items-center gap-2">
          <span className={`badge ${isPositive ? 'badge-success' : 'badge-danger'}`}>
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

function MarketSnapshot() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/market');
        const json = await res.json();
        if (json.success) setData(json.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchMarket();
  }, []);

  return (
    <section className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="flex items-center gap-2">
          <div style={{ background: 'var(--color-paper-3)', width: '32px', height: '32px', borderRadius: 'var(--radius-full)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Activity size={16} color="var(--color-text)" />
          </div>
          <h3>Pasar Terkini</h3>
        </div>
        <div className="badge flex items-center gap-2" style={{ backgroundColor: 'var(--color-paper)', border: '1px solid var(--color-border)' }}>
          <div style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-danger)', borderRadius: '50%', animation: 'blink 1.5s infinite' }}></div>
          Live
        </div>
      </div>
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: '100%', minHeight: '150px' }}>
            <div style={{ width: '30px', height: '30px', border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          data.map((item, idx) => {
            const change = item.changePercent || 0;
            const isUp = change > 0;
            const isDown = change < 0;
            return (
              <div key={idx} className="flex items-center justify-between" style={{ padding: 'var(--space-3)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
                <div className="flex flex-col">
                  <span className="font-medium">{item.symbol}</span>
                  <span className="text-xs text-muted">{item.name}</span>
                </div>
                <div className="flex flex-col" style={{ alignItems: 'flex-end' }}>
                  <span className="font-medium" style={{ fontSize: '0.875rem' }}>{item.formattedPrice || '-'}</span>
                  <div className="flex items-center gap-1" style={{ color: isUp ? 'var(--color-success, #10b981)' : isDown ? 'var(--color-danger, #ef4444)' : 'var(--color-text-muted)', fontSize: '0.75rem', fontWeight: 500 }}>
                    {isUp ? <TrendingUp size={12} /> : isDown ? <TrendingDown size={12} /> : null}
                    {item.formattedChange ? `${item.formattedChange} (${isUp ? '+' : ''}${change.toFixed(2)}%)` : `${isUp ? '+' : ''}${change.toFixed(2)}%`}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {!loading && (
        <p className="text-xs text-muted" style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
          *Data saham IDX memiliki delay 15 menit. Bitcoin real-time.
        </p>
      )}
    </section>
  );
}
