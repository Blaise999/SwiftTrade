'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="FX" color={C.gold}
      title="The exchange rate, without the bank's cut."
      sub="USD/HKD, EUR/USD and 50+ pairs at the mid-market rate, with the fee printed before you confirm. No spread games."
      heroImg={IMG('photo-1628348068343-c6a848d2b6dd')}
      blocks={[
        { h: 'Mid-market, not "our" rate', p: 'You see the same rate Google shows, plus a flat fee we state upfront. Compare it live against Chase and HSBC before you convert.', bullets: ['Flat, visible fee', 'Live bank comparison', 'No hidden spread'] },
        { h: 'USD to HKD on stablecoin rails', p: 'Convert and move in one step. Funds settle on regulated stablecoin rails in seconds, not over two days through correspondent banks.', img: IMG('photo-1605792657660-596af9009e82') },
        { h: 'Set it and forget it', p: 'Limit orders that fire at your target rate, and recurring conversions for rent or payroll across the Pacific.', bullets: ['Limit orders', 'Recurring conversions', 'Rate alerts'] },
      ]}
      ctaTitle="See your real savings vs your bank."
    />
  );
}
