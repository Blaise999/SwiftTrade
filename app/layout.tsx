import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'Swift Trade — Trade crypto, forex & stocks. Convert local cash with SwiftBridge.',
  description: 'The fastest way to move money and markets. Trade crypto, forex pairs and US stocks. Convert local currency to USDT in minutes with SwiftBridge — bureau de change for 20+ countries.',
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
