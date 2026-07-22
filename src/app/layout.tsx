import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from './Navigation';

export const metadata: Metadata = {
  title: "Ruang Harta",
  description: 'Perencanaan Keuangan Mendalam Berbasis AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>
        <div className="workbench-layout">
          <Navigation />
          
          {/* Main Content Area */}
          <main className="workbench-main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
