/**
 * Extended Scout 规则库 - Phase 1 扩展 (SECURITY-004 到 006)
 * 从 3 条规则扩展到 6 条
 * 
 * 新增规则:
 * - SECURITY-004: IV Validation (AES-GCM)
 * - SECURITY-005: Private Key Memory Clearing
 * - SECURITY-006: Mnemonic Storage Encryption
 */

const EXTENDED_RULES = {
  'SECURITY-004': {
    id: 'SECURITY-004',
    severity: 'HIGH',
    name: 'IV Validation in AES-GCM',
    description: 'IV (Initialization Vector) must come from secure source',
    category: 'cryptography',
    pattern: /crypto\.subtle\.encrypt.*AES-GCM.*iv\s*:/g,
    check: (code) => {
      // 检查: crypto.subtle.encrypt(...{ iv: ... })
      // 验证 iv 来自安全源（random 或 hash）
      const matches = code.match(/\biv\s*:\s*(\w+)/g);
      if (!matches) return { pass: true };

      const unsafeIVs = matches.filter(m => {
        const varName = m.split(':')[1].trim();
        // 检查是否来自不安全源
        return !code.includes(`crypto.getRandomValues(${varName})`) &&
               !code.includes(`hash(${varName})`);
      });

      return {
        pass: unsafeIVs.length === 0,
        issues: unsafeIVs.length > 0 ? [{
          type: 'IV_VALIDATION_FAILED',
          message: `Found ${unsafeIVs.length} IV(s) from unknown source`,
          severity: 'HIGH'
        }] : []
      };
    },
    remediation: `
    ✅ Correct:
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const result = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );

    ❌ Wrong:
      const iv = [1,2,3,4,5,6,7,8,9,10,11,12];  // Hardcoded!
      const result = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
      );
    `,
    references: [
      'https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt',
      'https://tools.ietf.org/html/rfc5116'
    ]
  },

  'SECURITY-005': {
    id: 'SECURITY-005',
    severity: 'HIGH',
    name: 'Private Key Memory Clearing',
    description: 'Private keys must be cleared from memory after use',
    category: 'memory-safety',
    pattern: /privateKey|private_key|priv_key/gi,
    check: (code) => {
      // 检查: 私钥变量使用后是否被清零
      const privateKeyVars = code.match(/(?:const|let|var)\s+(\w*private\w*)\s*=/gi);
      if (!privateKeyVars) return { pass: true };

      const issues = [];
      privateKeyVars.forEach(match => {
        const varName = match.match(/\b(\w+)\s*=/)[1];
        // 检查是否有清理代码
        const hasCleanup = code.includes(`${varName} = null`) ||
                          code.includes(`${varName} = ''`) ||
                          code.includes(`delete ${varName}`);
        if (!hasCleanup) {
          issues.push({
            type: 'KEY_NOT_CLEARED',
            message: `Private key '${varName}' not cleared after use`,
            severity: 'HIGH'
          });
        }
      });

      return {
        pass: issues.length === 0,
        issues: issues
      };
    },
    remediation: `
    ✅ Correct:
      const privateKey = await importPrivateKey(...);
      try {
        const signature = await sign(data, privateKey);
      } finally {
        // Clear from memory
        privateKey = null;  // or use Web Crypto secret key
      }

    ❌ Wrong:
      const privateKey = await importPrivateKey(...);
      const signature = await sign(data, privateKey);
      // privateKey still in memory!
    `,
    references: [
      'https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html',
      'https://www.securecoding.cert.org/confluence/display/java/SER05-J'
    ]
  },

  'SECURITY-006': {
    id: 'SECURITY-006',
    severity: 'HIGH',
    name: 'Mnemonic Storage Encryption',
    description: 'Mnemonic phrases must be encrypted when stored',
    category: 'data-protection',
    pattern: /localStorage\.setItem.*mnemonic|sessionStorage.*mnemonic/gi,
    check: (code) => {
      // 检查: 助记词是否以明文存储
      const mnemonicStores = code.match(/(?:localStorage|sessionStorage)\.setItem\([^)]*mnemonic[^)]*\)/gi);
      if (!mnemonicStores) return { pass: true };

      const issues = [];
      mnemonicStores.forEach(match => {
        // 检查是否有加密
        const beforeMatch = code.substring(Math.max(0, code.indexOf(match) - 500), code.indexOf(match));
        const hasEncryption = beforeMatch.includes('encrypt') ||
                             beforeMatch.includes('cipher') ||
                             beforeMatch.includes('seal');

        if (!hasEncryption) {
          issues.push({
            type: 'UNENCRYPTED_MNEMONIC',
            message: 'Mnemonic phrase stored in plaintext',
            severity: 'HIGH',
            context: match.substring(0, 80)
          });
        }
      });

      return {
        pass: issues.length === 0,
        issues: issues
      };
    },
    remediation: `
    ✅ Correct:
      const encrypted = await encryptData(mnemonic, masterKey);
      localStorage.setItem('mnemonic_encrypted', encrypted);

    ❌ Wrong:
      localStorage.setItem('mnemonic', mnemonic);  // Plaintext!
      sessionStorage.setItem('user_mnemonic', phrase);  // Exposed!
    `,
    references: [
      'https://github.com/bitcoinjs/bip39',
      'https://owasp.org/www-community/Sensitive_Data_Exposure'
    ]
  }
};

/**
 * 扩展的 Scout 扫描函数
 */
function scanExtendedRules(code) {
  const results = {
    issues: [],
    coverage: {
      total: Object.keys(EXTENDED_RULES).length,
      covered: 0
    }
  };

  for (const [ruleId, rule] of Object.entries(EXTENDED_RULES)) {
    const check = rule.check(code);

    if (!check.pass) {
      results.issues.push({
        id: ruleId,
        severity: rule.severity,
        name: rule.name,
        description: rule.description,
        issues: check.issues || [{
          type: 'RULE_FAILED',
          message: rule.description,
          severity: rule.severity
        }],
        remediation: rule.remediation,
        references: rule.references
      });
      results.coverage.covered++;
    }
  }

  results.coverage.percentage = (results.coverage.covered / results.coverage.total) * 100;

  return results;
}

/**
 * 生成扩展规则报告
 */
function generateExtendedRuleReport(scanResults) {
  let report = '# 🔒 Extended Security Rules Report\n\n';
  report += `**Coverage**: ${scanResults.coverage.covered}/${scanResults.coverage.total} rules\n`;
  report += `**Pass Rate**: ${scanResults.coverage.percentage.toFixed(1)}%\n\n`;

  if (scanResults.issues.length === 0) {
    report += '✅ All extended rules passed!\n';
  } else {
    report += '## ⚠️ Issues Found\n\n';
    scanResults.issues.forEach(issue => {
      report += `### ${issue.id}: ${issue.name}\n`;
      report += `**Severity**: ${issue.severity}\n`;
      report += `**Description**: ${issue.description}\n\n`;

      if (issue.issues && issue.issues.length > 0) {
        report += '**Details**:\n';
        issue.issues.forEach(detail => {
          report += `- ${detail.message}\n`;
        });
        report += '\n';
      }

      if (issue.remediation) {
        report += '**Remediation**:\n```\n' + issue.remediation + '```\n\n';
      }

      if (issue.references && issue.references.length > 0) {
        report += '**References**:\n';
        issue.references.forEach(ref => {
          report += `- [${ref}](${ref})\n`;
        });
        report += '\n';
      }
    });
  }

  return report;
}

// 导出
module.exports = {
  EXTENDED_RULES,
  scanExtendedRules,
  generateExtendedRuleReport
};
