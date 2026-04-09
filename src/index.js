/**
 * Demo Wallet - Minimal wallet implementation
 */

class DemoWallet {
  constructor(name) {
    this.name = name;
    this.balance = 0;
    this.transactions = [];
  }

  /**
   * Add balance
   */
  addBalance(amount) {
    if (amount <= 0) {
      throw new Error('Amount must be > 0');
    }
    this.balance = this.balance + amount;
    this.transactions.push({
      type: 'add',
      amount: amount,
      timestamp: Date.now()
    });
    return this.balance;
  }

  /**
   * Transfer to another wallet
   */
  transfer(toWallet, amount) {
    if (amount <= 0) {
      throw new Error('Transfer amount must be > 0');
    }
    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }
    
    this.balance -= amount;
    toWallet.balance += amount;
    
    this.transactions.push({
      type: 'transfer_out',
      to: toWallet.name,
      amount: amount,
      timestamp: Date.now()
    });
    
    toWallet.transactions.push({
      type: 'transfer_in',
      from: this.name,
      amount: amount,
      timestamp: Date.now()
    });
    
    return { from: this.name, to: toWallet.name, amount: amount };
  }

  getBalance() {
    return this.balance;
  }

  getTransactions() {
    return this.transactions;
  }
}

module.exports = DemoWallet;
