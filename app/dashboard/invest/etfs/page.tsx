'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import {
  getEtfsByCategory, getBeginnerEtfs, CATEGORY_LABELS, type EtfCategory,
} from '@/lib/etf-data';
import { EtfCard } from '@/components/investing/EtfCards';

const ORDER: EtfCategory[] = ['sp500', 'nasdaq_100', 'total_market', 'dividend', 'sector', 'bond'];

export default function ExploreEtfs() {
  return (
    <div className="min-h-screen bg-[#080A0D] pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-5">
        <div className="flex items-center gap-3 mb-1">
          <Link href="/dashboard/invest" prefetch={false}
            className="w-9 h-9 rounded-full bg-[#101216] border border-white/[0.06] flex items-center justify-center hover:bg-[#14171D]">
            <ArrowLeft className="w-4 h-4 text-[#A1A1AA]" />
          </Link>
          <h1 className="text-[20px] font-bold text-white">Explore ETFs</h1>
        </div>
        <p className="text-[12.5px] text-[#A1A1AA] ml-12 mb-6">
          Curated funds across the most popular long-term investing categories.
        </p>

        <section className="mb-8">
          <h2 className="text-[15px] font-semibold text-white mb-3">Beginner-friendly</h2>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {getBeginnerEtfs().map(e => <EtfCard key={e.symbol} etf={e} />)}
          </div>
        </section>

        {ORDER.map(cat => {
          const list = getEtfsByCategory(cat);
          if (!list.length) return null;
          return (
            <section key={cat} className="mb-8">
              <h2 className="text-[15px] font-semibold text-white mb-3">{CATEGORY_LABELS[cat]}</h2>
              <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                {list.map(e => <EtfCard key={e.symbol} etf={e} />)}
              </div>
            </section>
          );
        })}

        <p className="mt-6 text-[11px] text-[#52525B] leading-relaxed text-center px-4">
          Investing involves risk, including possible loss of principal. Past performance does not
          guarantee future results.
        </p>
      </div>
    </div>
  );
}
