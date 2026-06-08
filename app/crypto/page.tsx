'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="Crypto" color={C.ny}
      title="350+ coins. Keep the keys if you want them."
      sub="Trade majors and long-tail pairs with tight spreads, or connect a self-custody wallet and hold your own."
      heroImg={IMG('photo-1605792657660-596af9009e82')}
      blocks={[
        { h: 'Deep liquidity, tight spreads', p: 'BTC, ETH, SOL and 350+ pairs with pricing that holds up when the market moves fast.', bullets: ['350+ pairs', 'Tight spreads', 'Fast fills'] },
        { h: 'Custodial or self-custody', p: 'Keep funds with us for speed, or connect your own wallet when you would rather hold the keys. Switch any time.', img: IMG('photo-1611974789855-9c2a0a7236a3') },
        { h: 'Withdraw on-chain in minutes', p: 'Move to your own address whenever you want, with the network fee shown before you sign.', bullets: ['On-chain withdrawals', 'Fee shown upfront', 'Major networks supported'] },
      ]}
      ctaTitle="Trade or self-custody. Your call."
    />
  );
}
