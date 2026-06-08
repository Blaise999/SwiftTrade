'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="FX" color={C.gold}
      title="The exchange rate, without the bank's cut."
      sub="USD/HKD, EUR/USD, GBP/USD and 50+ pairs at the mid-market rate, with a flat fee printed before you confirm."
      lead="Banks make their money on FX where you can't see it: in the spread. You ask for dollars to Hong Kong dollars and quietly lose 2 to 3% to a marked-up rate. Swifttrade shows you the mid-market rate, the same one on Google, plus a flat fee stated before you confirm. Compare it live against Chase or HSBC, set a limit order to fire at your target, or schedule recurring conversions for rent and payroll across borders. When you want the money to actually move, the same engine powers SwiftBridge."
      heroImg={IMG('photo-1628348068343-c6a848d2b6dd')}
      blocks={[
        { h: 'Mid-market, not "our" rate', p: 'You see the same rate the market sees, plus a flat fee we print upfront. Compare it live against your bank before you convert a single dollar.', bullets: ['Flat, visible fee', 'Live bank comparison', 'No hidden spread', '50+ pairs'] },
        { h: 'Set it and forget it', p: 'Limit orders fire automatically at your target rate. Recurring conversions handle rent or payroll on schedule so you are not watching the chart all day.', img: IMG('photo-1611974789855-9c2a0a7236a3') },
        { h: 'Built for the NY to Asia corridor', p: 'USD, HKD, SGD, EUR and GBP, with the corridors our users actually use. The same FX engine settles SwiftBridge transfers in about 8 seconds.', bullets: ['USD/HKD, USD/SGD and more', 'Rate alerts', 'Powers SwiftBridge', 'Recurring conversions'] },
      ]}
      specs={[
        { title: 'Pairs & rate', items: [{ k: 'Pairs', v: '50+' }, { k: 'Rate', v: 'Mid-market' }, { k: 'Fee', v: 'Flat, upfront' }, { k: 'Spread markup', v: 'None' }] },
        { title: 'Tools', items: [{ k: 'Limit orders', v: 'Yes' }, { k: 'Recurring', v: 'Yes' }, { k: 'Rate alerts', v: 'Yes' }, { k: 'Bank comparison', v: 'Live' }] },
        { title: 'Corridors', items: [{ k: 'USD/HKD', v: 'Yes' }, { k: 'USD/SGD', v: 'Yes' }, { k: 'EUR, GBP', v: 'Yes' }, { k: 'Settles via', v: 'SwiftBridge' }] },
      ]}
      faqs={[
        { q: 'What rate do I actually get?', a: 'The mid-market rate, the same one you see on Google, plus a flat fee shown before you confirm. No markup buried in the rate.' },
        { q: 'How much does it save me?', a: 'It depends on your bank, but a typical USD/HKD conversion at a high-street bank carries a 2 to 3% markup. We show the live comparison so you can see your own number.' },
        { q: 'Can I schedule conversions?', a: 'Yes. Set recurring conversions for rent or payroll, or a limit order that fires at your target rate.' },
        { q: 'Is FX the same as SwiftBridge?', a: 'They share an engine. FX converts inside your account; SwiftBridge moves the converted money across borders in about 8 seconds.' },
      ]}
      ctaTitle="See your real savings vs your bank."
    />
  );
}
