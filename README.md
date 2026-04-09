# WorldWallet

Multi-chain crypto wallet: mnemonic create/import, balances, and transfers (ETH / TRX / USDT-TRC20 / BTC). The web app **source of truth** is **`dist/`** (plain HTML/CSS/JS), with shared logic under **`dist/core/`** and **`dist/js/`**.

## Project layout

- **`dist/`** — Web wallet (canonical tree)
  - **`wallet.html`** — App shell / entry
  - **`assets/`** — Static assets (libs, images)
  - **`core/`** — Wallet, security, chain logic
  - **`js/`** — Modules (storage, API config, etc.)
- **`client/`** — Optional React Native shell (separate from the web bundle above)

There is no separate `wallet-shell/` tree; edit files under **`dist/`** directly.

## Features

- **Create / import wallet** — BIP39 via `core/wallet.js`; optional PIN + encryption in `core/security.js`.
- **Home & balances** — `getBalance` + UI in `wallet.ui.js` / `wallet.tx.js`.
- **Send** — `sendTx` for TRX, ETH, USDT (TRC-20).
- **Optional React Native client** — See **`client/`** (not required for the web wallet).

## Run locally

Serve **`dist/`** with any static server, for example:

```bash
npm run dev
```

Then open the URL printed by the dev server (e.g. `http://127.0.0.1:8766/wallet.html`).

## Deploy

Use **`./deploy.sh`** (see script for options such as `NO_PUSH=1`). The web bundle is **`dist/`**; there is no separate sync step from another source tree.

### Automatic deploy (GitHub Actions → GitHub Pages)

On every push to **`main`** that touches `assets/**` (or the sync script / this workflow), **`.github/workflows/deploy-pages.yml`** builds a clean copy of `assets/` (excluding `node_modules` and `_expo`) and pushes it to the **`gh-pages`** branch for **GitHub Pages**.

1. In the GitHub repo: **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch” unless you prefer that).
2. After the first successful run, open the Pages URL shown in Settings, or attach your domain under **Custom domain** (should match `assets/CNAME`, e.g. `www.worldtoken.cc`) and add the DNS records GitHub shows.

If production still uses another host (FTP, VPS, nested `dist/` git from `deploy.sh`), keep using that flow or replace the deploy step in the workflow with your provider’s action (SSH, S3, Cloudflare, etc.).

## PIN storage

Use `Store.getPin()` / `Store.setPin()` from `dist/js/storage.js` (paths as loaded in `wallet.html`). Legacy `ww_unlock_pin` is migrated to `ww_pin`.

---

## React Native client (`client/`)

The **`client/`** package is an optional UI shell. It is **not** the same stack as the **`dist/`** web wallet (no Expo app in this repo unless you add it).

### Picker (important)

`Picker` was **removed from `react-native`** in newer releases; importing it from `react-native` is deprecated/broken.

- **Use** `@react-native-picker/picker` (see `client/src/components/CurrencySelector.js`).
- Install from the `client/` directory:

```bash
cd client
npm install
```

Do **not** use:

```javascript
import { Picker } from 'react-native'; // deprecated / removed
```

Use:

```javascript
import { Picker } from '@react-native-picker/picker';
```

---

## License

See project files for license terms (if applicable).
