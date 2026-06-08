'use client';
import { LegalPage } from '@/components/marketing/Templates';
export default function Page() {
  return (
    <LegalPage title="Terms of Service" updated="June 2026" blocks={[
      { h: 'Your account', p: 'By opening a Swifttrade account you agree to trade and transfer within the limits of your verified tier, to give us accurate information, and to use the platform lawfully. You are responsible for keeping your login and devices secure.' },
      { h: 'Orders and execution', p: 'Market orders execute at prevailing prices and may differ from the last quote shown, which is delayed. Limit orders execute only if the market reaches your price. We are not liable for losses from normal market movement.' },
      { h: 'Fees', p: 'Fees are shown before you confirm any trade or transfer. We bill subscriptions in USD. We will give notice before any fee change takes effect.' },
      { h: 'Changes and termination', p: 'We may update these terms with reasonable notice; continued use means you accept them. You can close your account at any time, subject to settling open positions and records we are required to keep.' },
    ]} />
  );
}
