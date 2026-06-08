'use client';
import { ProductPage } from '@/components/marketing/Templates';
import { IMG, C } from '@/components/marketing/Shell';
export default function Page() {
  return (
    <ProductPage
      eyebrow="SwiftBridge" color={C.teal}
      title="Money home before you lock your phone."
      sub="Send New York to Hong Kong to Singapore on stablecoin rails. Roughly 8 seconds, GENIUS Act compliant, fee shown upfront."
      heroImg={IMG('photo-1486406146926-c627a92ad1ab')}
      blocks={[
        { h: 'Roughly 8 seconds, not two days', p: 'Old wires bounce through three banks and a weekend. SwiftBridge settles on regulated stablecoin rails while you are still looking at the screen.', bullets: ['~8s typical settle', 'GENIUS Act compliant', 'No correspondent banks'] },
        { h: 'See the fee before you send', p: 'The rate and the fee are printed before you confirm. No "pending" surprises, no FX markup buried in the math.', img: IMG('photo-1628348068343-c6a848d2b6dd') },
        { h: 'Built for the NY to Asia corridor', p: 'Designed around the routes our users actually use: USD to HKD, SGD and back, with limits that scale as you verify.', bullets: ['USD, HKD, SGD', 'Tiered limits', 'Anonymized recent transfers shown live'] },
      ]}
      ctaTitle="Send a test $10 and time it yourself."
    />
  );
}
