import type { Metadata } from 'next';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'MAXCHICHAR // ARCHITECT PROTOCOL',
  description: 'Control Systems. Print Outcomes. Build. Execute. Scale.',
  themeColor: '#000005',
  openGraph: {
    title: 'MAXCHICHAR // ARCHITECT PROTOCOL',
    description: 'A 5D spatial portfolio experience.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="overflow-hidden bg-void text-ghost select-none">
        {children}
      </body>
    </html>
  );
}
