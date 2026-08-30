import type { Metadata } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import { NavigationLoader } from '@/components/layout/NavigationLoader';

export const metadata: Metadata = {
  title: 'AI Return Intelligence | E-commerce Return Analytics & Insights',
  description:
    'Identify recurring product problems, analyze customer return comments, determine severity, and recommend actionable solutions to reduce future returns.',
  keywords: [
    'E-commerce returns',
    'AI return intelligence',
    'Product return analysis',
    'Customer comment classification',
    'Return rate mitigation',
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        <AuthProvider>
          <DataProvider>
            <Suspense fallback={null}>
              <NavigationLoader />
            </Suspense>
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
