'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="Stocks" color={C.hk}
      title="US and HK markets in one account."
      sub="Over 5,000 US tickers plus HKEX names, fractional from a dollar, with a 1099-B at tax time."
      heroImg={IMG('photo-1504805572947-34fad45aed93')}
      blocks={[
        { h: 'Fractional from $1', p: 'Own a slice of NVDA, AAPL or 0700.HK without saving up for a full share. Buy by dollar amount, not share count.', bullets: ['Dollar-based investing', 'US and HKEX listings', 'No minimums'] },
        { h: 'Recurring auto-invest', p: 'Pick the amount and the day. We buy on schedule so you stop trying to time the open.', img: IMG('photo-1497215728101-856f4ea42174') },
        { h: 'Honest at tax time', p: 'A clean 1099-B for US filing and clear cost-basis records, so April is paperwork, not panic.', bullets: ['1099-B included', 'Cost-basis tracking', 'Exportable statements'] },
      ]}
      ctaTitle="Buy your first slice today."
    />
  );
}
