import * as bip39 from 'bip39';
import { ethers } from 'ethers';

// 支持的链配置
export const CHAINS = {
  ETH: {
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '🔷',
    derivationPath: "m/44'/60'/0'/0/0",
    rpc: 'https://eth.llamarpc.com',
    explorer: 'https://etherscan.io',
  },
  TRX: {
    name: 'Tron',
    symbol: 'TRX',
    icon: '🔴',
    derivationPath: "m/44'/195'/0'/0/0",
    rpc: 'https://api.trongrid.io',
    explorer: 'https://tronscan.org',
  },
  BTC: {
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: '🟠',
    derivationPath: "m/44'/0'/0'/0/0",
    rpc: 'https://blockstream.info/api',
    explorer: 'https://blockstream.info',
  },
};

// 生成新助记词（BIP39）
export function generateMnemonic(wordCount: 12 | 24 = 12): string {
  const strength = wordCount === 12 ? 128 : 256;
  return bip39.generateMnemonic(strength);
}

// 验证助记词
export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

// 从助记词派生 ETH 地址
export async function deriveETHAddress(mnemonic: string): Promise<{
  address: string;
  privateKey: string;
}> {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic);
  return {
    address: wallet.address,
    privateKey: wallet.privateKey,
  };
}

// 从助记词派生 TRX 地址（波场使用和 ETH 相同的椭圆曲线，只是地址格式不同）
export async function deriveTRXAddress(mnemonic: string): Promise<{
  address: string;
  privateKey: string;
}> {
  const wallet = ethers.Wallet.fromMnemonic(mnemonic, "m/44'/195'/0'/0/0");
  // TRX 地址：把 ETH 地址的 0x 换成 T（简化版，实际需要 base58check 编码）
  const ethAddr = wallet.address;
  const trxAddress = 'T' + ethAddr.slice(2, 34);
  return {
    address: trxAddress,
    privateKey: wallet.privateKey,
  };
}

// 生成万语地址（WorldWallet 特色地址）
export function generateWorldAddress(
  prefix: string, // 8位随机数字
  customChars: string[], // 10个用户自定义/随机字符
  suffix: string, // 8位随机数字
): string {
  return prefix + customChars.join('') + suffix;
}

export function randomDigits(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

// 查询 ETH 余额
export async function getETHBalance(address: string): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(CHAINS.ETH.rpc);
    const balance = await provider.getBalance(address);
    return ethers.utils.formatEther(balance);
  } catch (e) {
    return '0.00';
  }
}

// 查询 ETH 上的 USDT 余额 (ERC-20)
export async function getUSDTBalanceETH(address: string): Promise<string> {
  try {
    const provider = new ethers.providers.JsonRpcProvider(CHAINS.ETH.rpc);
    const usdtContract = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
    const abi = ['function balanceOf(address) view returns (uint256)'];
    const contract = new ethers.Contract(usdtContract, abi, provider);
    const balance = await contract.balanceOf(address);
    return (Number(balance) / 1e6).toFixed(2);
  } catch (e) {
    return '0.00';
  }
}

// 查询 TRX 余额（通过 TronGrid API）
export async function getTRXBalance(address: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.trongrid.io/v1/accounts/${address}`
    );
    const data = await res.json();
    if (data.data && data.data[0]) {
      return (data.data[0].balance / 1e6).toFixed(2);
    }
    return '0.00';
  } catch (e) {
    return '0.00';
  }
}

// ETH 转账
export async function sendETH(
  privateKey: string,
  toAddress: string,
  amount: string,
): Promise<string> {
  const provider = new ethers.providers.JsonRpcProvider(CHAINS.ETH.rpc);
  const wallet = new ethers.Wallet(privateKey, provider);
  const tx = await wallet.sendTransaction({
    to: toAddress,
    value: ethers.utils.parseEther(amount),
  });
  return tx.hash;
}
