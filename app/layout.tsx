import './globals.css';
import '../styles/theme.css';
import { Providers } from './providers';
import CookieConsent from '@/components/CookieConsent';

export const metadata = {
  title: 'Swifttrade — US stocks, crypto, FX, and instant USD to HKD',
  description: 'US stocks, crypto and FX in one account, with instant USD to HKD on stablecoin rails via SwiftBridge. Built in New York and Hong Kong.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover' as const,
};

// Runs before paint so the saved theme applies with no flash.
const themeInit = `(function(){try{var t=localStorage.getItem('st-theme');var d=t?t==='dark':true;document.documentElement.classList.toggle('dark',d);}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="bg-void text-cream font-body antialiased">
        <Providers>
          {children}
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
