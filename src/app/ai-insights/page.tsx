"use client";

import React, { useEffect, useState } from 'react';
import { Bot, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AIInsightsPage() {
  const router = useRouter();
  const [insightText, setInsightText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    analyzeData();
  }, []);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    setInsightText("");
    
    try {
      const existing = localStorage.getItem('ruang_harta_transactions');
      const txs = existing ? JSON.parse(existing) : [];
      
      if (txs.length === 0) {
        setHasData(false);
        setIsAnalyzing(false);
        return;
      }
      
      setHasData(true);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txs),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error("Gagal");
      
      const responseText = result.insight;
      
      let i = 0;
      const interval = setInterval(() => {
        setInsightText(responseText.slice(0, i));
        i++;
        if (i > responseText.length) {
          clearInterval(interval);
          setIsAnalyzing(false);
        }
      }, 15); // Faster typing effect for full page
    } catch (err) {
      setInsightText("Maaf, terjadi kesalahan saat menghubungi asisten AI.");
      setIsAnalyzing(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header */}
      <header className="flex items-center justify-between" style={{ marginBottom: 'var(--space-8)' }}>
        <div>
          <h1 style={{ marginBottom: 'var(--space-2)' }} className="flex items-center gap-2">
            <Bot size={28} color="var(--color-accent)" /> 
            AI Financial Report
          </h1>
          <p className="text-muted">Analisis mendalam kebiasaan finansialmu oleh Gemini AI.</p>
        </div>
        <button className="btn btn-secondary" onClick={analyzeData} disabled={isAnalyzing || !hasData}>
          <Sparkles size={16} /> Analisis Ulang
        </button>
      </header>

      {!hasData && !isAnalyzing ? (
        <div className="glass-panel" style={{ padding: 'var(--space-12)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--color-paper-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={32} color="var(--color-text-muted)" />
          </div>
          <h3>Belum Ada Data Transaksi</h3>
          <p className="text-muted" style={{ maxWidth: '400px' }}>
            AI kami butuh data untuk dianalisis. Coba scan beberapa struk belanja atau masukkan bukti pemasukanmu di Dashboard!
          </p>
          <button className="btn btn-primary" onClick={() => router.push('/')} style={{ marginTop: 'var(--space-4)' }}>
            Kembali ke Dashboard <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
          {isAnalyzing && insightText.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-6)' }}>
              <div style={{ width: '60px', height: '60px', border: '4px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
              <p className="text-lg font-medium" style={{ animation: 'pulse 2s infinite' }}>Membaca jutaan parameter finansialmu...</p>
            </div>
          ) : (
            <div style={{ flex: 1, padding: 'var(--space-4)' }}>
              <div style={{ padding: 'var(--space-6)', backgroundColor: 'var(--color-paper-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', minHeight: '300px' }}>
                {insightText.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} style={{ marginBottom: 'var(--space-4)', lineHeight: 1.8, fontSize: '1.05rem' }}>
                    {paragraph}
                  </p>
                ))}
                {isAnalyzing && <span style={{ display: 'inline-block', width: '6px', height: '18px', backgroundColor: 'var(--color-accent)', animation: 'blink 1s step-end infinite' }} />}
              </div>
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
