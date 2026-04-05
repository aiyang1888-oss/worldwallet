#!/usr/bin/env python3
"""加入余额查询功能"""
path = "/Users/daxiang/Desktop/WorldWallet/assets/wallet.html"
with open(path, encoding='utf-8') as f:
    c = f.read()

# 1. 余额显示改为动态
old_bal = '''        <div class="home-balance">$12,480.36</div>
        <div class="home-balance-sub">≈ 90,106 CNY · +2.4% 今日</div>'''
new_bal = '''        <div class="home-balance" id="totalBalanceUSD">$0.00</div>
        <div class="home-balance-sub" id="totalBalanceCNY">正在加载余额...</div>'''
c = c.replace(old_bal, new_bal, 1)
print("✅ 余额显示改为动态")

# 2. 资产余额也改为动态
old_usdt = '>8,500</div><div class="asset-value">$8,500.00</div>'
new_usdt = '><span id="balUsdt">0.00</span></div><div class="asset-value">$<span id="usdUsdt">0.00</span></div>'
if old_usdt in c:
    c = c.replace(old_usdt, new_usdt, 1)
    print("✅ USDT 余额动态化")

old_btc = '>0.0521</div><div class="asset-value">$2,980.36</div>'
new_btc = '><span id="balEth">0.0000</span></div><div class="asset-value">$<span id="usdEth">0.00</span></div>'
if old_btc in c:
    c = c.replace(old_btc, new_btc, 1)
    print("✅ ETH 余额动态化")

old_trx = '>1,200</div><div class="asset-value">$200.00</div>'
new_trx = '><span id="balTrx">0.00</span></div><div class="asset-value">$<span id="usdTrx">0.00</span></div>'
if old_trx in c:
    c = c.replace(old_trx, new_trx, 1)
    print("✅ TRX 余额动态化")

# 3. 在 </script> 末尾（最后一个）加入余额查询逻辑
balance_js = '''

// ── 余额查询 ──────────────────────────────────────────────────
async function loadBalances() {
  if (!REAL_WALLET) return;
  
  const ethAddr = REAL_WALLET.ethAddress;
  const trxAddr = REAL_WALLET.trxAddress;
  
  let totalUSD = 0;
  
  try {
    // 查询 TRX 余额（TronGrid 免费 API）
    const trxRes = await fetch(`https://api.trongrid.io/v1/accounts/${trxAddr}`);
    const trxData = await trxRes.json();
    if (trxData.data && trxData.data[0]) {
      const trxBal = (trxData.data[0].balance / 1e6).toFixed(2);
      const trxPrice = 0.12; // 估算价格
      const trxUSD = (parseFloat(trxBal) * trxPrice).toFixed(2);
      document.getElementById('balTrx') && (document.getElementById('balTrx').textContent = trxBal);
      document.getElementById('usdTrx') && (document.getElementById('usdTrx').textContent = trxUSD);
      totalUSD += parseFloat(trxUSD);
      
      // 查询 TRC-20 USDT 余额
      const trc20 = trxData.data[0].trc20;
      if (trc20) {
        const usdt = trc20.find(t => t['TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t']);
        if (usdt) {
          const usdtBal = (parseInt(Object.values(usdt)[0] as string) / 1e6).toFixed(2);
          document.getElementById('balUsdt') && (document.getElementById('balUsdt').textContent = usdtBal);
          document.getElementById('usdUsdt') && (document.getElementById('usdUsdt').textContent = usdtBal);
          totalUSD += parseFloat(usdtBal);
        }
      }
    }
  } catch(e) {
    console.log('TRX balance error:', e);
  }
  
  try {
    // 查询 ETH 余额（无需 API key 的公共节点）
    const ethRes = await fetch(`https://eth.llamarpc.com`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'eth_getBalance',
        params: [ethAddr, 'latest'], id: 1
      })
    });
    const ethData = await ethRes.json();
    if (ethData.result) {
      const ethBal = (parseInt(ethData.result, 16) / 1e18).toFixed(4);
      const ethPrice = 3200; // 估算价格
      const ethUSD = (parseFloat(ethBal) * ethPrice).toFixed(2);
      document.getElementById('balEth') && (document.getElementById('balEth').textContent = ethBal);
      document.getElementById('usdEth') && (document.getElementById('usdEth').textContent = ethUSD);
      totalUSD += parseFloat(ethUSD);
    }
  } catch(e) {
    console.log('ETH balance error:', e);
  }
  
  // 更新总余额
  document.getElementById('totalBalanceUSD') && (document.getElementById('totalBalanceUSD').textContent = '$' + totalUSD.toFixed(2));
  document.getElementById('totalBalanceCNY') && (document.getElementById('totalBalanceCNY').textContent = '≈ ' + (totalUSD * 7.2).toFixed(0) + ' CNY');
}

// 页面加载时查询余额
window.addEventListener('load', () => {
  setTimeout(() => {
    if (REAL_WALLET) loadBalances();
  }, 1000);
});
'''

# 找到最后一个 </script> 插入
last_script = c.rfind('</script>')
if last_script != -1:
    c = c[:last_script] + balance_js + c[last_script:]
    print("✅ 余额查询 JS 注入")

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print("完成！")
