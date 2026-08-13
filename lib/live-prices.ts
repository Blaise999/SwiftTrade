/**
 * Server-side live prices — one place so every endpoint values holdings the same
 * way. Stocks via Alpaca, crypto via CoinGecko (demo/pro) -> Coinbase. All
 * best-effort: returns {} on failure so callers fall back to their own prices.
 */
const num = (v: unknown) => { const x = Number(v); return Number.isFinite(x) ? x : 0; };

export type LivePrice = { price: number; change: number };

const CG_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', BNB: 'binancecoin', XRP: 'ripple',
  ADA: 'cardano', AVAX: 'avalanche-2', DOT: 'polkadot', TRX: 'tron', DOGE: 'dogecoin',
  SHIB: 'shiba-inu', PEPE: 'pepe', WIF: 'dogwifcoin', LINK: 'chainlink', UNI: 'uniswap',
  AAVE: 'aave', MKR: 'maker', LDO: 'lido-dao', MATIC: 'matic-network', LTC: 'litecoin',
  ATOM: 'cosmos', NEAR: 'near', CRO: 'crypto-com-chain', OKB: 'okb', IMX: 'immutable-x',
  SAND: 'the-sandbox', AXS: 'axie-infinity', MANA: 'decentraland',
  TON: 'the-open-network',
  ICP: 'internet-computer',
  APT: 'aptos',
  SUI: 'sui',
  SEI: 'sei-network',
  INJ: 'injective-protocol',
  RUNE: 'thorchain',
  FTM: 'fantom',
  ALGO: 'algorand',
  HBAR: 'hedera-hashgraph',
  VET: 'vechain',
  EGLD: 'elrond-erd-2',
  FLOW: 'flow',
  THETA: 'theta-token',
  XTZ: 'tezos',
  EOS: 'eos',
  NEO: 'neo',
  KAS: 'kaspa',
  MINA: 'mina-protocol',
  KAVA: 'kava',
  GRT: 'the-graph',
  SNX: 'havven',
  COMP: 'compound-governance-token',
  CRV: 'curve-dao-token',
  '1INCH': '1inch',
  SUSHI: 'sushi',
  YFI: 'yearn-finance',
  DYDX: 'dydx-chain',
  GMX: 'gmx',
  PENDLE: 'pendle',
  ENA: 'ethena',
  JUP: 'jupiter-exchange-solana',
  BONK: 'bonk',
  FLOKI: 'floki',
  BOME: 'book-of-meme',
  MEW: 'cat-in-a-dogs-world',
  BRETT: 'based-brett',
  POPCAT: 'popcat',
  MOG: 'mog-coin',
  TURBO: 'turbo',
  FET: 'fetch-ai',
  RENDER: 'render-token',
  TAO: 'bittensor',
  ARB: 'arbitrum',
  OP: 'optimism',
  STX: 'blockstack',
  MANTA: 'manta-network',
  STRK: 'starknet',
  ZK: 'zksync',
  BLUR: 'blur',
  ENS: 'ethereum-name-service',
  CHZ: 'chiliz',
  GALA: 'gala',
  APE: 'apecoin',
  ENJ: 'enjincoin',
  GMT: 'stepn',
  PYTH: 'pyth-network',
  W: 'wormhole',
  TIA: 'celestia',
  DYM: 'dymension',
  ONDO: 'ondo-finance',
  ETHFI: 'ether-fi',
  RON: 'ronin',
  QNT: 'quant-network',
  KCS: 'kucoin-shares',
  GT: 'gatechain-token',
  FLR: 'flare-networks',
  AR: 'arweave',
  AKT: 'akash-network',
};
const STABLE = new Set(['USDT', 'USDC', 'DAI', 'USD']);

export async function fetchCryptoPrices(symbols: string[]): Promise<Record<string, LivePrice>> {
  const out: Record<string, LivePrice> = {};
  const syms = Array.from(new Set(symbols.map((s) => String(s).toUpperCase()).filter(Boolean)));
  for (const s of syms) if (STABLE.has(s)) out[s] = { price: 1, change: 0 };
  const need = syms.filter((s) => !STABLE.has(s));
  if (!need.length) return out;

  // CoinGecko (demo or pro, respects COINGECKO_API_URL)
  try {
    const ids = need.map((s) => CG_IDS[s]).filter(Boolean);
    if (ids.length) {
      const key = process.env.COINGECKO_API_KEY?.trim();
      let base = (process.env.COINGECKO_API_URL?.trim() || 'https://api.coingecko.com/api/v3').replace(/\/+$/, '');
      if (!/\/api\/v3$/.test(base)) base += '/api/v3';
      const isPro = base.includes('pro-api');
      const p = new URLSearchParams({ ids: ids.join(','), vs_currencies: 'usd', include_24hr_change: 'true' });
      if (key) p.set(isPro ? 'x_cg_pro_api_key' : 'x_cg_demo_api_key', key);
      const j = await (await fetch(`${base}/simple/price?${p}`, { cache: 'no-store' })).json();
      for (const s of need) {
        const id = CG_IDS[s];
        const row = id ? j?.[id] : null;
        const price = num(row?.usd);
        if (price > 0) out[s] = { price, change: num(row?.usd_24h_change) };
      }
    }
  } catch {}

  // Coinbase for anything still missing (price only)
  const missing = need.filter((s) => !out[s]);
  await Promise.all(missing.map(async (s) => {
    try {
      const j = await (await fetch(`https://api.coinbase.com/v2/prices/${s}-USD/spot`, { cache: 'no-store' })).json();
      const price = num(j?.data?.amount);
      if (price > 0) out[s] = { price, change: 0 };
    } catch {}
  }));

  return out;
}

export async function fetchStockPrices(symbols: string[]): Promise<Record<string, LivePrice>> {
  const out: Record<string, LivePrice> = {};
  const syms = Array.from(new Set(symbols.map((s) => String(s).toUpperCase()).filter(Boolean)));
  if (!syms.length) return out;

  const id = process.env.ALPACA_API_KEY_ID, sk = process.env.ALPACA_API_SECRET_KEY;
  if (id && sk) {
    try {
      const feed = (process.env.ALPACA_DATA_FEED || 'iex').trim();
      const url = `https://data.alpaca.markets/v2/stocks/snapshots?symbols=${syms.join(',')}&feed=${feed}`;
      const res = await fetch(url, {
        headers: { accept: 'application/json', 'APCA-API-KEY-ID': id, 'APCA-API-SECRET-KEY': sk }, cache: 'no-store',
      });
      if (res.ok) {
        const j = await res.json();
        const snaps = j?.snapshots || j;
        for (const s of syms) {
          const snap = snaps?.[s];
          if (!snap) continue;
          const price = num(snap.latestTrade?.p) || num(snap.latestQuote?.ap) || num(snap.minuteBar?.c) || num(snap.dailyBar?.c);
          const prevClose = num(snap.prevDailyBar?.c) || num(snap.dailyBar?.o);
          const change = prevClose > 0 && price > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
          if (price > 0) out[s] = { price, change };
        }
      }
    } catch {}
  }

  // Finnhub fallback for leftovers
  const key = process.env.FINNHUB_API_KEY?.trim();
  const missing = syms.filter((s) => !out[s]);
  if (key && missing.length) {
    await Promise.all(missing.map(async (s) => {
      try {
        const j = await (await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${key}`, { cache: 'no-store' })).json();
        const price = num(j?.c);
        if (price > 0) out[s] = { price, change: num(j?.dp) };
      } catch {}
    }));
  }

  return out;
}
