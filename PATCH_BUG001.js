// ─── BUG-001 修复：强制隐藏所有弹窗（防止页面加载时自动显示） ────
try {
  const modalIds = [
    'walletLoadingOverlay',
    'pinModal',
    'pinSetModal',
    'totpModal',
    'totpSetModal',
    'worldAddressModal'
  ];
  
  modalIds.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.remove('show');
      el.style.display = 'none';
    }
  });
} catch (_modalFix) {
  console.error('[BUG-001] 弹窗隐藏失败:', _modalFix);
}
// ────────────────────────────────────────────────────────────────
