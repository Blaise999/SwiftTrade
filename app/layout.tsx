import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Swifttrade — US stocks, crypto, FX, and instant USD to HKD',
  description: 'US stocks, crypto and FX in one account, with instant USD to HKD on stablecoin rails via SwiftBridge. Built in New York and Hong Kong.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-void text-cream font-body antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
