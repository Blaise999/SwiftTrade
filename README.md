# Swift Trade

> **The private bank for global traders.**
> Crypto, foreign exchange, and global equities — settled through one custody account.
> Local currency moved across 80+ markets via **SwiftBridge**, our concierge bureau de change.

![Swift Trade](https://images.unsplash.com/photo-1576487236230-eaa4afe68192?auto=format&fit=crop&w=1600&q=70)

## What it is

Swift Trade is a Hong Kong–licensed multi-asset trading platform with one
distinguishing feature: a **concierge desk that converts local currency
to crypto in minutes**, in 80+ markets, paying out through verified
institutional rails. It's not P2P. It's a desk.

## Built around three ideas

- **One account, three asset classes** — Bitcoin alongside Apple, the Yen alongside Solana, with one set of fees and one custody surface.
- **SwiftBridge** — A staffed concierge that quotes you a rate, replies in minutes with verified payout details, and credits crypto the same minute proof clears.
- **Self-custody on demand** — Bring any wallet (MetaMask, Coinbase, Trust, WalletConnect). Withdraw any asset, on any chain, any time.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript
- Tailwind (custom sapphire / champagne / pearl palette + Fraunces serif)
- Supabase (Postgres + Auth + Realtime + Storage)
- Framer Motion · Lucide · Zustand
- Wagmi + RainbowKit

## Getting started

```bash
pnpm install
cp .env.example .env.local                     # fill in 3 Supabase keys
# In Supabase SQL editor, run in order:
#   supabase/01_schema.sql
#   supabase/02_seed.sql
#   supabase/03_admin_bootstrap.sql
pnpm dev
```

After step 3 of the SQL run, this user exists and can log in:

| Field    | Value                       |
|----------|-----------------------------|
| Name     | Blaise Chimdi               |
| Email    | `blaiseidoko@gmail.com`     |
| Password | `Blaise999`                 |
| Role     | `admin` · Sovereign tier    |

Same credentials work at `/auth/login` (trader console) **and** `/admin/login` (operations panel).

## SwiftBridge — the concierge

```
01  Choose your jurisdiction       → 80+ markets, local currency, target asset
02  Receive payout instructions    → verified bank, mobile money, e-wallet
03  Settle locally, upload proof   → screenshot of confirmation is enough
04  Crypto credited, instantly tradable
```

Status machine: `awaiting_admin → awaiting_payment → awaiting_verification → completed | rejected | expired`

| Endpoint                          | Purpose                                |
|-----------------------------------|----------------------------------------|
| `POST /api/bridge/create`         | User submits a request                 |
| `POST /api/bridge/upload-proof`   | Multipart upload of payment proof      |
| `POST /api/bridge/admin`          | Operations: respond / approve / reject |

Storage bucket: `bridge-proofs` (private, RLS-gated).

## Design system

| Token              | Value     | Notes                              |
|--------------------|-----------|-------------------------------------|
| `bg-void`          | `#070612` | Deepest, slightly warm midnight    |
| `bg-obsidian`      | `#0a0918` | Body                                |
| `bg-charcoal`      | `#11102a` | Cards                               |
| `text-pearl-50`    | `#fdfcf8` | Primary type — pearl, not cream    |
| `text-pearl-200`   | `#dcd6c8` | Body type                           |
| `sapphire-500`     | `#5b6dff` | Primary brand · indigo, not cyan   |
| `champagne-300`    | `#ead68a` | Editorial accent · italic emphasis |
| `profit`           | `#3aa978` | Refined green, not neon            |
| `loss`             | `#d8493e` | Tempered red                        |

Type stack:
- **Fraunces** — display serif (headlines, italic emphasis)
- **Sora**     — geometric sans (UI, buttons)
- **Inter**    — body
- **JetBrains Mono** — numerics

## Hong Kong roots

Headquartered at Two IFC, 8 Finance Street, Central. Operates 24/7 across nine time zones. SFC Type 1, 4, 9 licensed. SOC 2 Type II audited. Segregated funds at HSBC + Standard Chartered.

## License
Private / proprietary.
