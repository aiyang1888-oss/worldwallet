/**
 * Demo Wallet Tests
 */

const DemoWallet = require('../src/index');

describe('DemoWallet', () => {
  let wallet1, wallet2;

  beforeEach(() => {
    wallet1 = new DemoWallet('Alice');
    wallet2 = new DemoWallet('Bob');
  });

  test('should initialize with zero balance', () => {
    expect(wallet1.getBalance()).toBe(0);
  });

  test('should add positive balance', () => {
    wallet1.addBalance(100);
    expect(wallet1.getBalance()).toBe(100);
  });

  test('should NOT allow negative balance', () => {
    expect(() => wallet1.addBalance(-50)).toThrow('Amount must be > 0');
    expect(wallet1.getBalance()).toBe(0);  // Balance should remain unchanged
  });

  test('should transfer between wallets', () => {
    wallet1.addBalance(100);
    wallet1.transfer(wallet2, 30);
    expect(wallet1.getBalance()).toBe(70);
    expect(wallet2.getBalance()).toBe(30);
  });

  test('should not transfer more than balance', () => {
    wallet1.addBalance(50);
    expect(() => wallet1.transfer(wallet2, 100)).toThrow('Insufficient balance');
  });

  test('should not transfer zero or negative', () => {
    wallet1.addBalance(100);
    expect(() => wallet1.transfer(wallet2, 0)).toThrow('Transfer amount must be > 0');
    expect(() => wallet1.transfer(wallet2, -10)).toThrow('Transfer amount must be > 0');
  });

  test('should record transactions', () => {
    wallet1.addBalance(100);
    wallet1.transfer(wallet2, 50);
    expect(wallet1.getTransactions()).toHaveLength(2);
    expect(wallet2.getTransactions()).toHaveLength(1);
  });
});
