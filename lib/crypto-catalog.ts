export type CryptoCat = 'layer1' | 'defi' | 'meme' | 'stable' | 'exchange' | 'gaming';
export type Coin = { symbol: string; name: string; price: number; change: number; cat: CryptoCat };

export const CAT_LABELS: Record<CryptoCat, string> = {
  layer1: 'Layer 1', defi: 'DeFi', meme: 'Meme coins', stable: 'Stablecoins',
  exchange: 'Exchange tokens', gaming: 'Gaming & metaverse',
};

export const COINS: Coin[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67234.5, change: 2.45, cat: 'layer1' },
  { symbol: 'ETH', name: 'Ethereum', price: 3456.78, change: -1.23, cat: 'layer1' },
  { symbol: 'SOL', name: 'Solana', price: 145.32, change: 5.67, cat: 'layer1' },
  { symbol: 'BNB', name: 'BNB', price: 567.89, change: 0.87, cat: 'exchange' },
  { symbol: 'XRP', name: 'XRP', price: 0.5234, change: -0.45, cat: 'layer1' },
  { symbol: 'ADA', name: 'Cardano', price: 0.4567, change: 1.23, cat: 'layer1' },
  { symbol: 'AVAX', name: 'Avalanche', price: 35.67, change: -2.34, cat: 'layer1' },
  { symbol: 'DOT', name: 'Polkadot', price: 7.89, change: 0.56, cat: 'layer1' },
  { symbol: 'TRX', name: 'TRON', price: 0.1234, change: 1.02, cat: 'layer1' },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.0823, change: 3.45, cat: 'meme' },
  { symbol: 'SHIB', name: 'Shiba Inu', price: 0.0000234, change: 4.12, cat: 'meme' },
  { symbol: 'PEPE', name: 'Pepe', price: 0.0000098, change: 7.88, cat: 'meme' },
  { symbol: 'WIF', name: 'dogwifhat', price: 2.34, change: 6.21, cat: 'meme' },
  { symbol: 'LINK', name: 'Chainlink', price: 14.56, change: 1.89, cat: 'defi' },
  { symbol: 'UNI', name: 'Uniswap', price: 12.34, change: 4.76, cat: 'defi' },
  { symbol: 'AAVE', name: 'Aave', price: 98.45, change: 2.11, cat: 'defi' },
  { symbol: 'MKR', name: 'Maker', price: 2456.7, change: -0.98, cat: 'defi' },
  { symbol: 'LDO', name: 'Lido DAO', price: 1.87, change: 3.02, cat: 'defi' },
  { symbol: 'MATIC', name: 'Polygon', price: 0.5678, change: 4.22, cat: 'layer1' },
  { symbol: 'LTC', name: 'Litecoin', price: 95.67, change: 2.5, cat: 'layer1' },
  { symbol: 'ATOM', name: 'Cosmos', price: 9.45, change: 3.05, cat: 'layer1' },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: 6.78, change: 5.44, cat: 'layer1' },
  { symbol: 'USDT', name: 'Tether', price: 1.0, change: 0.01, cat: 'stable' },
  { symbol: 'USDC', name: 'USD Coin', price: 1.0, change: 0.0, cat: 'stable' },
  { symbol: 'CRO', name: 'Cronos', price: 0.123, change: 1.44, cat: 'exchange' },
  { symbol: 'OKB', name: 'OKB', price: 45.6, change: 0.77, cat: 'exchange' },
  { symbol: 'IMX', name: 'Immutable', price: 2.11, change: 6.7, cat: 'gaming' },
  { symbol: 'SAND', name: 'The Sandbox', price: 0.456, change: 3.9, cat: 'gaming' },
  { symbol: 'AXS', name: 'Axie Infinity', price: 6.23, change: 2.8, cat: 'gaming' },
  { symbol: 'MANA', name: 'Decentraland', price: 0.412, change: 4.5, cat: 'gaming' },
];

export const getCoin = (symbol: string) => COINS.find(c => c.symbol.toUpperCase() === String(symbol).toUpperCase());
export const byCat = (c: CryptoCat) => COINS.filter(x => x.cat === c);
export const topMoversCrypto = [...COINS].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 10);
export const popularCrypto = COINS.slice(0, 10);
export const fmtCryptoPrice = (p: number) => p >= 1 ? p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : p.toPrecision(3);
