// lib/etf-data.ts
//
// BACK-COMPAT SHIM: keeps the old `import { ... } from '@/lib/etf-data'`
// imports working. All asset data now lives in `lib/asset-catalog.ts`
// (ETFs + individual stocks). New code should import from there.

export type {
  AssetCategory as EtfCategory,
  Asset as Etf,
} from './asset-catalog';

export {
  ETFS,
  SP500_SYMBOLS,
  CATEGORY_LABELS,
  getSP500Etfs,
  getEtfsByCategory,
  getAsset as getEtf,
  getBeginnerEtfs,
} from './asset-catalog';
