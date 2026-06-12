'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { C } from '@/components/marketing/Shell';
import { BridgeReceiptVisual } from '@/components/marketing/Visuals';
export default function Page() {
  return (
    <ProductPage
      eyebrow="SwiftBridge" color={C.teal}
      title="Money home before you lock your phone."
      sub="Send New York to Hong Kong to Singapore on regulated stablecoin rails. Roughly 8 seconds, GENIUS Act compliant, fee shown upfront."
      lead="SwiftBridge is the part of the account for moving money, not trading it. A traditional wire bounces through three banks and a weekend, costs a flat fee plus a hidden FX markup, and lands in a day or two if you are lucky. SwiftBridge settles on regulated stablecoin rails in roughly 8 seconds, at the mid-market rate, with the fee printed before you press send. It is one feature inside Swifttrade, alongside stocks, crypto and FX, not a separate app you have to manage."
      heroVisual={<BridgeReceiptVisual />}
      blocks={[
        { h: 'Roughly 8 seconds, not two days', p: 'Old wires route through correspondent banks and stall over weekends. SwiftBridge moves on regulated stablecoin rails and settles while you are still looking at the screen.', bullets: ['~8s typical settle', 'GENIUS Act compliant', 'No correspondent banks', 'Works on weekends'] },
        { h: 'See the fee before you send', p: 'The rate and the fee are printed before you confirm. No "pending" surprises, no FX markup hidden in the math, no guessing what lands on the other side.', bullets: ['Rate and fee printed first', 'No deductions on arrival', 'Receipt with reference ID', 'Mid-market conversion'] },
        { h: 'Built for the NY to Asia corridor', p: 'Designed around the routes our users actually use: USD to HKD and SGD and back, with limits that scale as you verify your account.', bullets: ['USD, HKD, SGD', 'Tiered limits by verification', 'Anonymised recent transfers shown live', 'Same FX engine as the rest of the app'] },
      ]}
      specs={[
        { title: 'Speed & rails', items: [{ k: 'Typical settle', v: '~8 seconds' }, { k: 'Rails', v: 'Regulated stablecoin' }, { k: 'Weekends', v: 'Works' }, { k: 'Compliance', v: 'GENIUS Act' }] },
        { title: 'Cost', items: [{ k: 'Rate', v: 'Mid-market' }, { k: 'Fee', v: 'Shown upfront' }, { k: 'Hidden markup', v: 'None' }] },
        { title: 'Corridors', items: [{ k: 'New York', v: 'Yes' }, { k: 'Hong Kong', v: 'Yes' }, { k: 'Singapore', v: 'Yes' }, { k: 'Limits', v: 'Tiered' }] },
      ]}
      faqs={[
        { q: 'How fast is it, honestly?', a: 'Typically around 8 seconds for supported corridors on regulated stablecoin rails. It works on weekends, unlike traditional wires.' },
        { q: 'What does it cost?', a: 'The mid-market rate plus a flat fee shown before you send. No markup buried in the FX, no surprise deductions on arrival.' },
        { q: 'Which routes are supported?', a: 'The New York to Hong Kong to Singapore corridor today, with USD, HKD and SGD. Limits scale as you verify your account.' },
        { q: 'Is SwiftBridge a separate app?', a: 'No. It is one feature inside Swifttrade, alongside stocks, crypto and FX. The same balance and the same FX engine power it.' },
      ]}
      ctaTitle="Send a test $10 and time it yourself."
    />
  );
}
