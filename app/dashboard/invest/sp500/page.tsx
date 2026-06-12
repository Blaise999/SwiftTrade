'use client';

import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { getSP500Etfs } from '@/lib/etf-data';
import { SP500Card } from '@/components/investing/EtfCards';

export default function SP500Page() {
  const etfs = getSP500Etfs();
  return (
    <div className="min-h-screen bg-[#0A1526] pb-28">
      <div className="max-w-2xl mx-auto pt-5">
        <div className="flex items-center gap-3 mb-4">
          <Link href="/dashboard/invest" prefetch={false}
            className="w-9 h-9 rounded-full bg-[#0F1D33] border border-white/[0.06] flex items-center justify-center hover:bg-[#13243D]">
            <ArrowLeft className="w-4 h-4 text-[#8A9BB3]" />
          </Link>
          <h1 className="text-[20px] font-bold text-white">Invest in the S&P 500</h1>
        </div>

        <div className="rounded-2xl border border-[#C4A052]/15 bg-gradient-to-br from-[#C4A052]/[0.06] to-transparent p-4 mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-[#C4A052]" />
            <h2 className="text-[15px] font-semibold text-white">What is the S&P 500?</h2>
          </div>
          <p className="text-[12.5px] text-[#8A9BB3] leading-relaxed">
            The S&P 500 tracks around 500 of the largest publicly traded companies in the United
            States. You cannot buy the index directly, but you can invest through ETFs that track it.
            These four are among the most popular long-term options.
          </p>
        </div>

        <div className="space-y-2.5">
          {etfs.map(e => <SP500Card key={e.symbol} etf={e} />)}
        </div>

        <p className="mt-8 text-[11px] text-[#4D5B70] leading-relaxed text-center px-4">
          Investing involves risk, including possible loss of principal. Expense ratios shown are
          annual. Past performance does not guarantee future results.
        </p>
      </div>
    </div>
  );
}
