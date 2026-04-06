# WorldWallet

Multi-chain crypto wallet: mnemonic create/import, balances, and transfers (ETH / TRX / USDT-TRC20 / BTC). The main app lives in **`wallet-shell/`** (plain HTML/CSS/JS) with logic in **`wallet-shell/core/`**.

## Features

- **Create / import wallet** — BIP39 via `core/wallet.js`; optional PIN + encryption in `core/security.js`.
- **Home & balances** — `getBalance` + UI in `wallet.ui.js` / `wallet.tx.js`.
- **Send** — `sendTx` for TRX, ETH, USDT (TRC-20).
- **Optional React Native client** — See **`client/`** (separate app; not required for the web wallet).

## Web app (`wallet-shell/`)

| Path | Role |
|------|------|
| `wallet-shell/index.html` | App shell |
| `wallet-shell/core/wallet.js` | `createWallet`, `importWallet`, `deriveAddress`, `getBalance`, `sendTx` |
| `wallet-shell/core/security.js` | PIN, AES-GCM |
| `wallet-shell/js/api-config.js` | Optional TronGrid API key via `<meta name="wt-tron-api-key">` (no keys in repo) |
| `dist/wallet.html` | Deployed copy; run `./scripts/sync-dist.sh` or `./deploy.sh` |

### Run locally

Open `wallet-shell/index.html` in a browser, or serve `wallet-shell/` with any static server.

### Deploy

- **`./scripts/sync-dist.sh`** — Copies shell → `dist/` (no git).
- **`NO_PUSH=1 ./deploy.sh "msg"`** — Full sync + optional git in `dist/`.

### PIN storage

Use `Store.getPin()` / `Store.setPin()` from `wallet-shell/js/storage.js`. Legacy `ww_unlock_pin` is migrated to `ww_pin`.

---

## React Native client (`client/`)

The **`client/`** package is an optional UI shell. It is **not** the same stack as `wallet-shell/` (no Expo app in this repo unless you add it).

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
