/**
 * Minimal balance helpers (in-memory).
 */
let balance = 0;

function getBalance() {
  return balance;
}

function addBalance(amount) {
  if (amount <= 0) throw new Error("Amount must be > 0");
  balance += amount;
}

module.exports = { getBalance, addBalance };
