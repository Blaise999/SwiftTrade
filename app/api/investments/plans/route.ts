import { NextResponse } from 'next/server';
import { INVESTMENT_PLANS } from '@/lib/investments/plan';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    plans: INVESTMENT_PLANS,
  });
}