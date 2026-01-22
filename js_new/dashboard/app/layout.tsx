/**
 * Root Layout Component
 * Provides global styles and layout structure
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'EDGE Gateway Dashboard',
  description: 'Industrial IoT Gateway Monitoring and Control',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
