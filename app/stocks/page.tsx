'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="Stocks" color={C.hk}
      title="US and HK stocks in one free account."
      sub="Over 5,000 US tickers plus HKEX listings, fractional from a dollar, zero commission, with a 1099-B at tax time."
      lead="Most brokers make you pick a side of the Pacific. Swifttrade doesn't. Buy fractional NVDA and VOO on NASDAQ and NYSE, pick up 0700.HK and 9988.HK on the Hong Kong exchange, and hold it all in one balance with no commission on US trades and no account fee. Recurring buys run on the day you choose, extended-hours trading is on when the news breaks early, and every reportable trade lands on a clean 1099-B so April is paperwork instead of panic."
      heroImg={IMG('photo-1504805572947-34fad45aed93')}
      blocks={[
        { h: 'Fractional from $1, no commission', p: 'Own a slice of a $900 share for a dollar. Buy by amount, not share count, and pay $0 commission on US stocks and ETFs. No PFOF on HK listings, and we tell you where US flow routes.', bullets: ['$0 US commission', 'Dollar-based investing', 'No account minimum', 'No monthly fee'] },
        { h: 'US and Hong Kong, one balance', p: 'NYSE and NASDAQ names alongside HKEX listings most US brokers can\'t touch. Trade Apple in the morning and Tencent at night without moving money between apps.', img: IMG('photo-1486406146926-c627a92ad1ab') },
        { h: 'Recurring buys and extended hours', p: 'Set an amount and a day and we buy on schedule, so you stop trying to time the open. When earnings drop after the bell, extended-hours trading means you are not stuck waiting until tomorrow.', bullets: ['Recurring auto-invest', 'Extended-hours trading', 'Market and limit orders', 'Real-time quotes'] },
        { h: 'Honest at tax time', p: 'A clean 1099-B for US filing, clear cost-basis records, and exportable statements. No reconstructing your year from screenshots in April.', img: IMG('photo-1497215728101-856f4ea42174') },
      ]}
      specs={[
        { title: 'Coverage', items: [{ k: 'US listings', v: '5,000+' }, { k: 'Exchanges', v: 'NYSE, NASDAQ' }, { k: 'Hong Kong', v: 'HKEX' }, { k: 'ETFs', v: 'Yes' }] },
        { title: 'Trading', items: [{ k: 'Commission', v: '$0 (US)' }, { k: 'Fractional', v: 'From $1' }, { k: 'Order types', v: 'Market, limit, recurring' }, { k: 'Extended hours', v: 'Yes' }, { k: 'Settlement', v: 'T+1' }] },
        { title: 'Account', items: [{ k: 'Minimum', v: '$0' }, { k: 'Tax doc', v: '1099-B' }, { k: 'Funding', v: 'Plaid, ACH, wire, FPS' }, { k: 'Apps', v: 'iOS, Android, web' }] },
      ]}
      faqs={[
        { q: 'Is there really no commission?', a: 'No commission on US stocks and ETFs, and no account or monthly fee. We earn on FX, a small crypto spread, and interest on idle cash.' },
        { q: 'Can I buy Hong Kong stocks?', a: 'Yes. HKEX-listed names like 0700.HK and 9988.HK trade in the same account as your US holdings.' },
        { q: 'How small a slice can I buy?', a: 'From $1. You buy by dollar amount, so a high-priced share is still within reach.' },
        { q: 'Will I get tax documents?', a: 'US users receive a 1099-B for reportable activity, with cost-basis records and exportable statements.' },
      ]}
      ctaTitle="Buy your first slice today."
    />
  );
}
