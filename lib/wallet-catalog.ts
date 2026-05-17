export type WalletPurpose = 'deposit' | 'tier_checkout';
export type WalletType = WalletPurpose | 'both';

export type WalletCatalogSlot = {
  symbol: string;
  network: string;
  name: string;
  icon: string;
  defaultAddress: string;
};

export type ResolvedWallet = {
  id: string;
  symbol: string;
  network: string;
  name: string;
  icon?: string;
  address: string;
  enabled: boolean;
  label?: string | null;
  walletType: WalletPurpose;
  source: 'user' | 'global' | 'default';
  minAmount: number;
  confirmations: number;
};

export const WALLET_CATALOG: WalletCatalogSlot[] = [
  {
    symbol: 'USDT',
    network: 'TRC20',
    name: 'USDT (TRC20)',
    icon: '₮',
    defaultAddress: 'TB5shBuWQyXARujM5v3Ls1d9h89Mj6rpAm',
  },
  {
    symbol: 'USDT',
    network: 'ERC20',
    name: 'USDT (ERC20)',
    icon: '₮',
    defaultAddress: '0x778202B1F139F2Ba7225B69b7D5B23f62Df012fB',
  },
  {
    symbol: 'USDC',
    network: 'ERC20',
    name: 'USDC (ERC20)',
    icon: '$',
    defaultAddress: '0x778202B1F139F2Ba7225B69b7D5B23f62Df012fB',
  },
  {
    symbol: 'ETH',
    network: 'ERC20',
    name: 'Ethereum',
    icon: 'Ξ',
    defaultAddress: '0x806Ff945262b10873E2BE52c36aB4f8a6610d795',
  },
  {
    symbol: 'BTC',
    network: 'BTC',
    name: 'Bitcoin',
    icon: '₿',
    defaultAddress: 'bc1qg65xxa2pa457qhppnx4w0k4vdl73rdcfp9ep9z',
  },
  {
    symbol: 'SOL',
    network: 'SOL',
    name: 'Solana',
    icon: '◎',
    defaultAddress: 'GofuZHjrfBASWkU4py2YNuGBZ6MCeaDbdxmEKkXS72mF',
  },
];

export function normalizeKeyPart(value?: string | null) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

export function walletKey(currency?: string | null, network?: string | null) {
  return `${normalizeKeyPart(currency)}::${normalizeKeyPart(network)}`;
}