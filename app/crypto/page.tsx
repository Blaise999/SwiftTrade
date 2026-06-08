'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="Crypto" color={C.ny}
      title="350+ coins. Keep the keys if you want them."
      sub="Trade majors and long-tail pairs with tight, visible spreads, or connect a self-custody wallet and hold your own."
      lead="Crypto on most consumer apps means a dozen coins and a spread you can't see. Swifttrade gives you 350+ pairs with pricing that holds up when the market actually moves, and a real choice about custody. Keep funds with us for instant trades and fast settlement, or connect your own wallet and hold the keys yourself. Withdraw on-chain in minutes across major networks, with the network fee shown before you sign. No lock-ins, no surprise spread, no games."
      heroImg={IMG('photo-1605792657660-596af9009e82')}
      blocks={[
        { h: 'Deep liquidity, spreads you can see', p: 'BTC, ETH, SOL and 350+ pairs. The spread is displayed live before you trade, so you always know the real cost. Trade from a dollar.', bullets: ['350+ pairs', 'Live, visible spread', 'Trade from $1', 'Fast fills'] },
        { h: 'Custodial or self-custody. Your call.', p: 'Keep funds with us for speed, or connect a self-custody wallet and hold your own keys. Switch any time. We never ask for your seed phrase.', img: IMG('photo-1611974789855-9c2a0a7236a3') },
        { h: 'On-chain withdrawals in minutes', p: 'Move to your own address whenever you want across major networks, with the network fee shown before you confirm. No multi-day holds.', bullets: ['Major networks supported', 'Network fee shown upfront', 'Address whitelisting', 'No withdrawal lock-ins'] },
        { h: 'Trade crypto and stocks side by side', p: 'Rotate from ETH into NVDA, or hedge a position without leaving the app. One balance, one tax view, both markets.', img: IMG('photo-1504805572947-34fad45aed93') },
      ]}
      specs={[
        { title: 'Markets', items: [{ k: 'Pairs', v: '350+' }, { k: 'Majors', v: 'BTC, ETH, SOL +' }, { k: 'Trading hours', v: '24/7' }, { k: 'Min trade', v: '$1' }] },
        { title: 'Custody', items: [{ k: 'Custodial', v: 'Yes' }, { k: 'Self-custody', v: 'Optional' }, { k: 'Cold storage', v: 'Yes' }, { k: 'Seed phrase asked', v: 'Never' }] },
        { title: 'Withdrawals', items: [{ k: 'On-chain', v: 'Minutes' }, { k: 'Networks', v: 'BTC, ETH, SOL +' }, { k: 'Fee', v: 'Shown upfront' }, { k: 'Whitelisting', v: 'Yes' }] },
      ]}
      faqs={[
        { q: 'Can I hold my own keys?', a: 'Yes. Connect a self-custody wallet and hold your own keys, or keep funds with us for speed. Switch any time.' },
        { q: 'How many coins are supported?', a: 'Over 350 pairs, from majors like BTC, ETH and SOL to long-tail tokens, with new listings added regularly.' },
        { q: 'What does it cost to trade?', a: 'A tight spread shown live before you confirm. No hidden markup, and no separate trading commission.' },
        { q: 'How fast are withdrawals?', a: 'On-chain withdrawals typically clear in minutes across supported networks, with the network fee shown before you sign.' },
      ]}
      ctaTitle="Trade or self-custody. Your call."
    />
  );
}
