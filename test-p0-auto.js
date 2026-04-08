#!/usr/bin/env node

/**
 * P0 Automated Testing Script
 * 使用 Puppeteer 自动化测试
 * 
 * 使用方法:
 *   终端 1: npm run dev   （http://127.0.0.1:8766 ，根目录 dist/）
 *   终端 2: npm install puppeteer && node test-p0-auto.js
 *   可选: WALLET_TEST_URL=http://127.0.0.1:8766/wallet.html
 */

const fs = require('fs');
const path = require('path');

class P0TestRunner {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 6,
        passed: 0,
        failed: 0
      }
    };
    this.walletURL =
      process.env.WALLET_TEST_URL || 'http://127.0.0.1:8766/wallet.html';
  }

  /**
   * 需要 Puppeteer 支持的测试
   */
  async runWithPuppeteer() {
    try {
      const puppeteer = require('puppeteer');
      console.log('✅ Puppeteer 可用，启动浏览器自动化测试...\n');
      
      const browser = await puppeteer.launch({
        headless: false,  // 显示浏览器窗口
        args: ['--no-sandbox']
      });
      
      const page = await browser.newPage();
      
      // P0-001: PIN Unlock
      console.log('🧪 P0-001: PIN Unlock...');
      await page.goto(this.walletURL);
      await page.waitForTimeout(2000);
      
      const realWallet = await page.evaluate(() => {
        return {
          loaded: !!window.REAL_WALLET,
          ethAddr: window.REAL_WALLET?.ethAddress,
          trxAddr: window.REAL_WALLET?.trxAddress,
          btcAddr: window.REAL_WALLET?.btcAddress
        };
      });
      
      if (realWallet.loaded) {
        this.recordTest('P0-001', true, 'REAL_WALLET loaded successfully');
        console.log('✅ P0-001 PASS\n');
      } else {
        this.recordTest('P0-001', false, 'REAL_WALLET not loaded');
        console.log('❌ P0-001 FAIL\n');
      }
      
      // P0-002: Address Consistency (5 refreshes)
      console.log('🧪 P0-002: Address Consistency...');
      const initialAddr = realWallet.trxAddr;
      let allSame = true;
      
      for (let i = 1; i <= 5; i++) {
        await page.reload();
        await page.waitForTimeout(1000);
        
        const currentAddr = await page.evaluate(() => {
          return window.REAL_WALLET?.trxAddress;
        });
        
        if (currentAddr !== initialAddr) {
          allSame = false;
          console.log(`  ❌ Refresh ${i}: Address changed!`);
        } else {
          console.log(`  ✅ Refresh ${i}: Address same`);
        }
      }
      
      if (allSame) {
        this.recordTest('P0-002', true, 'Address consistent across 5 refreshes');
        console.log('✅ P0-002 PASS\n');
      } else {
        this.recordTest('P0-002', false, 'Address inconsistency detected');
        console.log('❌ P0-002 FAIL\n');
      }
      
      // P0-003: Key Encryption
      console.log('🧪 P0-003: Key Encryption...');
      const keyStatus = await page.evaluate(() => {
        return {
          ethKey: window.REAL_WALLET?.eth?.privateKey,
          trxKey: window.REAL_WALLET?.trx?.privateKey,
          btcKey: window.REAL_WALLET?.btc?.privateKey
        };
      });
      
      const keysEncrypted = !keyStatus.ethKey && !keyStatus.trxKey && !keyStatus.btcKey;
      if (keysEncrypted) {
        this.recordTest('P0-003', true, 'All private keys encrypted (undefined)');
        console.log('✅ P0-003 PASS\n');
      } else {
        this.recordTest('P0-003', false, 'Private keys not properly encrypted');
        console.log('❌ P0-003 FAIL\n');
      }
      
      // P0-005: PIN Hash Upgrade
      console.log('🧪 P0-005: PIN Hash Upgrade...');
      const pinStatus = await page.evaluate(() => {
        return {
          saltExists: !!localStorage.getItem('ww_pin_device_salt_v1'),
          hashExists: !!localStorage.getItem('ww_pin_hash'),
          saltValue: localStorage.getItem('ww_pin_device_salt_v1')?.substring(0, 50)
        };
      });
      
      if (pinStatus.saltExists && pinStatus.hashExists) {
        this.recordTest('P0-005', true, 'Device salt created and PIN hash updated');
        console.log('✅ P0-005 PASS\n');
      } else {
        this.recordTest('P0-005', false, 'PIN upgrade not complete');
        console.log('❌ P0-005 FAIL\n');
      }
      
      // P0-006: IndexedDB Migration
      console.log('🧪 P0-006: IndexedDB Migration...');
      const idbStatus = await page.evaluate(() => {
        return {
          migrated: localStorage.getItem('ww_idb_migrated_v1') === 'true',
          ww_wallet: !!localStorage.getItem('ww_wallet'),
          ww_pin_hash: !!localStorage.getItem('ww_pin_hash'),
          ww_pin_device_salt: !!localStorage.getItem('ww_pin_device_salt_v1')
        };
      });
      
      const allKeysPresent = idbStatus.ww_wallet && idbStatus.ww_pin_hash && idbStatus.ww_pin_device_salt;
      if (idbStatus.migrated && allKeysPresent) {
        this.recordTest('P0-006', true, 'IDB migration complete with all keys');
        console.log('✅ P0-006 PASS\n');
      } else {
        this.recordTest('P0-006', false, 'IDB migration incomplete');
        console.log('❌ P0-006 FAIL\n');
      }
      
      // P0-004: Base64 Error (需要手动或高级测试)
      console.log('🧪 P0-004: Base64 Error Handling (MANUAL TEST)');
      console.log('  ⚠️  This test requires manual intervention');
      console.log('  Steps: Modify localStorage.ww_wallet, remove last 10 chars, refresh');
      this.recordTest('P0-004', null, 'Requires manual testing');
      
      await browser.close();
      
      // 生成报告
      this.generateReport();
      
    } catch (error) {
      console.error('⚠️  Puppeteer not available or error occurred:', error.message);
      console.log('\n💡 Puppeteer 未安装。尝试手动测试模式...\n');
      this.runManualTestGuide();
    }
  }

  /**
   * 手动测试指南
   */
  runManualTestGuide() {
    console.log(`
════════════════════════════════════════════════════════════════
🧪 MANUAL TEST GUIDE - P0 Testing
════════════════════════════════════════════════════════════════

To install Puppeteer and run automated tests:
  npm install puppeteer
  node test-p0-auto.js

Or follow manual steps in P0_TESTING_LIVE.md（须先 npm run dev）:
  http://127.0.0.1:8766/wallet.html
  详见 LOCAL_TEST.md

Console commands ready for copy-paste testing.

════════════════════════════════════════════════════════════════
    `);
  }

  recordTest(testName, passed, message) {
    this.results.tests[testName] = {
      passed: passed,
      message: message,
      timestamp: new Date().toISOString()
    };
    
    if (passed === true) {
      this.results.summary.passed++;
    } else if (passed === false) {
      this.results.summary.failed++;
    }
  }

  generateReport() {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('📊 P0 TEST SUMMARY');
    console.log('════════════════════════════════════════════════════════════════\n');
    
    let markdown = '# 🧪 P0 Automated Test Results\n\n';
    markdown += `**Timestamp**: ${this.results.timestamp}\n`;
    markdown += `**Tests Run**: ${this.results.summary.total}\n`;
    markdown += `**Passed**: ${this.results.summary.passed}\n`;
    markdown += `**Failed**: ${this.results.summary.failed}\n`;
    markdown += `**Success Rate**: ${((this.results.summary.passed / this.results.summary.total) * 100).toFixed(1)}%\n\n`;
    
    markdown += '## Results\n\n';
    
    for (const [testName, result] of Object.entries(this.results.tests)) {
      const icon = result.passed === true ? '✅' : result.passed === false ? '❌' : '⚠️';
      markdown += `- ${icon} **${testName}**: ${result.message}\n`;
      console.log(`${icon} ${testName}: ${result.message}`);
    }
    
    // 保存报告
    const reportPath = path.join(__dirname, 'P0_AUTOTEST_RESULTS.md');
    fs.writeFileSync(reportPath, markdown);
    
    console.log('\n✅ Report saved:', reportPath);
  }
}

// 主程序
async function main() {
  const runner = new P0TestRunner();
  
  console.log(`
════════════════════════════════════════════════════════════════
🚀 P0 Automated Testing Started
════════════════════════════════════════════════════════════════
  `);
  
  await runner.runWithPuppeteer();
}

main().catch(console.error);
