"use client";

import { LayoutDashboard, Wallet, ReceiptText, Target, Bot, LogOut } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

export function Navigation() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === '/login' || pathname === '/signup') return null;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
    } catch { /* ignore errors on logout */ }
    router.push('/login');
    router.refresh();
  };

  const navItemStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3)',
    borderRadius: 'var(--radius-md)',
    color: active ? 'var(--color-text)' : 'var(--color-text-muted)',
    backgroundColor: active ? 'var(--color-paper-3)' : 'transparent',
    transition: 'all 0.15s ease',
    fontSize: '0.875rem',
    fontWeight: active ? 500 : 400,
    textDecoration: 'none'
  });

  return (
    <>
      {/* Mobile Top Bar (Only visible on small screens) */}
      <div className="mobile-top-bar flex items-center gap-2">
        <div style={{ background: 'var(--color-accent)', width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wallet size={16} color="var(--color-paper)" />
        </div>
        <h2 className="text-lg" style={{ margin: 0, fontWeight: 600 }}>Ruang Harta</h2>
      </div>

      <nav className="workbench-nav" style={{ padding: 'var(--space-6) var(--space-4)', gap: 'var(--space-8)' }}>
      <div className="flex items-center gap-2" style={{ padding: '0 var(--space-2)' }}>
        <div style={{ background: 'var(--color-accent)', width: '32px', height: '32px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Wallet size={18} color="var(--color-paper)" />
        </div>
        <h2 className="text-xl" style={{ margin: 0, fontWeight: 600 }}>Ruang Harta</h2>
      </div>
      
      <div className="flex-col gap-1" style={{ flex: 1 }}>
        <Link href="/" className={pathname === '/' ? 'nav-item-active' : 'nav-item'} style={navItemStyle(pathname === '/')}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </Link>
        <Link href="/transaksi" className={pathname === '/transaksi' ? 'nav-item-active' : 'nav-item'} style={navItemStyle(pathname === '/transaksi')}>
          <ReceiptText size={18} />
          <span>Transaksi</span>
        </Link>
        <Link href="/target" className={pathname === '/target' ? 'nav-item-active' : 'nav-item'} style={navItemStyle(pathname === '/target')}>
          <Target size={18} />
          <span>Target & Tabungan</span>
        </Link>
        <Link href="/ai-insights" className={pathname === '/ai-insights' ? 'nav-item-active' : 'nav-item'} style={navItemStyle(pathname === '/ai-insights')}>
          <Bot size={18} />
          <span>AI Insights</span>
        </Link>
      </div>
      
      <div className="glass-panel" style={{ padding: 'var(--space-4)', background: 'var(--color-paper-2)', marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center gap-2 mb-2">
          <span className="badge badge-success">Pro Plan</span>
        </div>
        <p className="text-xs text-muted" style={{ marginTop: 'var(--space-2)' }}>
          AI Financial Analyst is monitoring your portfolio.
        </p>
      </div>

      <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--color-danger, #ef4444)', borderColor: 'transparent' }}>
        <LogOut size={18} />
        <span className="nav-text">Keluar</span>
      </button>
    </nav>
    </>
  );
}
