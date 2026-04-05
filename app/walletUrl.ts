import Constants from 'expo-constants';

const DEFAULT = 'https://www.worldtoken.cc/wallet.html';

type Extra = { walletUrl?: string };

/**
 * 优先级：
 * 1. 环境变量 EXPO_PUBLIC_WALLET_URL（本地 .env，无需改 app.json）
 * 2. app.json → expo.extra.walletUrl
 * 3. 默认线上地址
 */
export function getWalletUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_WALLET_URL;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  const extra = Constants.expoConfig?.extra as Extra | undefined;
  const fromExtra = extra?.walletUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }
  return DEFAULT;
}
