import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { BottomNav } from '@/components/layout/bottom-nav';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'مدير الاستوديو',
  description: 'إدارة الجداول والحضور والإحصائيات',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'مدير الاستوديو',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#008D8B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${cairo.variable} font-sans antialiased bg-background`}>
        <div className="flex flex-col min-h-svh max-w-lg mx-auto relative">
          <main className="flex-1 pb-20">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
