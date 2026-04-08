# WorldWallet React Native client (optional)

This folder is a small React Native UI layer. The production wallet is the web app under **`../dist/`** (static `wallet.html` and assets).

## Setup

```bash
npm install
```

`CurrencySelector` uses **`@react-native-picker/picker`**. Do not import `Picker` from `react-native` (deprecated / removed in current RN).

## Picker migration

| Avoid | Use |
|-------|-----|
| `import { Picker } from 'react-native'` | `import { Picker } from '@react-native-picker/picker'` |

See `src/components/CurrencySelector.js`.
