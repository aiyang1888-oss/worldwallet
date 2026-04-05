import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateMnemonic, deriveETHAddress, deriveTRXAddress, randomDigits } from '../crypto/wallet';

export interface WalletState {
  mnemonic: string;
  ethAddress: string;
  trxAddress: string;
  privateKey: string;
  worldPrefix: string;
  worldSuffix: string;
  worldChars: string[];
  isCreated: boolean;
}

const STORAGE_KEY = 'worldwallet_state';

// 字库（手机键盘可打）
const CHAR_POOLS: Record<string, string> = {
  zh: '龙凤虎鹤福寿禄喜财春夏秋冬金木水火土山川云月星日风雨雪',
  ja: 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほ',
  ko: 'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ',
  ar: 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
  ru: 'абвгдежзийклмнопрстуфхцчшщыьэюя',
  hi: 'अआइउएओकखगघचजटडतथदधनपफबभमयरलवशसह',
  es: 'áéíóúüñ',
  fr: 'àâçéèêëîïôùûü',
  de: 'äöüÄÖÜ',
  el: 'αβγδεζηθικλμνξοπρστυφχψω',
};

function randChar(): string {
  const langs = Object.keys(CHAR_POOLS);
  const lang = langs[Math.floor(Math.random() * langs.length)];
  const pool = CHAR_POOLS[lang];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 创建新钱包
export async function createWallet(): Promise<WalletState> {
  const mnemonic = generateMnemonic(12);
  const eth = await deriveETHAddress(mnemonic);
  const trx = await deriveTRXAddress(mnemonic);
  
  const worldChars = Array.from({ length: 10 }, () => randChar());
  
  const state: WalletState = {
    mnemonic,
    ethAddress: eth.address,
    trxAddress: trx.address,
    privateKey: eth.privateKey,
    worldPrefix: randomDigits(8),
    worldSuffix: randomDigits(8),
    worldChars,
    isCreated: true,
  };
  
  await saveWallet(state);
  return state;
}

// 从助记词恢复钱包
export async function restoreWallet(mnemonic: string): Promise<WalletState> {
  const eth = await deriveETHAddress(mnemonic);
  const trx = await deriveTRXAddress(mnemonic);
  
  const worldChars = Array.from({ length: 10 }, () => randChar());
  
  const state: WalletState = {
    mnemonic,
    ethAddress: eth.address,
    trxAddress: trx.address,
    privateKey: eth.privateKey,
    worldPrefix: randomDigits(8),
    worldSuffix: randomDigits(8),
    worldChars,
    isCreated: true,
  };
  
  await saveWallet(state);
  return state;
}

// 保存钱包（注意：生产环境私钥应用 Keychain 加密存储）
export async function saveWallet(state: WalletState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// 加载钱包
export async function loadWallet(): Promise<WalletState | null> {
  const data = await AsyncStorage.getItem(STORAGE_KEY);
  if (!data) return null;
  return JSON.parse(data);
}

// 删除钱包
export async function deleteWallet(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

// 获取万语地址字符串
export function getWorldAddress(state: WalletState): string {
  return state.worldPrefix + state.worldChars.join('') + state.worldSuffix;
}
