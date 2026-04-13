// 强制更新管理器 (force-update.js)
// 一键从远程仓库拉取最新版本，清除 SW 缓存，不影响用户数据

const ForceUpdater = (() => {

  // 需要更新的文件列表（静态资源，不包含用户数据）
  const FILES_TO_UPDATE = [
    'index.html',
    'style.css',
    'online-app.css',
    'script.js',
    'sw.js',
    'manifest.json',
    'prompt-manager.js',
    'online-chat-manager.js',
    'online-chat-integration.js',
    'sticker-vision.js',
    'notification-manager.js',
    'character-generator.js',
    'structured-memory.js',
    'structured-memory.css',
    'helper-assistant.js',
    'sw.js',
    'style.css',
    'data-persistence.js',
    'qq-undefined-filter.js',
    'server.js',
    'force-update.js'
  ];

  

  const _injectStyles = () => {
    if (document.getElementById('force-update-styles')) return;
    const style = document.createElement('style');
    style.id = 'force-update-styles';
    style.textContent = `
    #force-update-overlay, #force-update-progress, #force-update-result {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(0,0,0,0.4); display: flex; justify-content: center; align-items: center;
      z-index: 999999; opacity: 0; transition: opacity 0.3s; pointer-events: none;
    }
    #force-update-overlay.show, #force-update-progress.show, #force-update-result.show { 
      opacity: 1; pointer-events: auto; 
    }
    .force-update-modal {
      background: #fff; border-radius: 24px; width: 85%; max-width: 320px; padding: 30px 20px;
      text-align: center; box-shadow: 0 10px 40px rgba(0,0,0,0.15);
      transform: scale(0.95); transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .show .force-update-modal { transform: scale(1); }
    .fu-icon { font-size: 48px; margin-bottom: 15px; }
    .fu-title { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 15px; }
    .fu-desc { font-size: 14px; color: #666; line-height: 1.6; margin-bottom: 25px; }
    .fu-desc strong { font-weight: normal; color: #333; }
    .fu-buttons { display: flex; flex-direction: column; gap: 12px; }
    .fu-btn { padding: 14px; border-radius: 25px; border: none; font-size: 16px; font-weight: 500; cursor: pointer; transition: opacity 0.2s; }
    .fu-btn:active { opacity: 0.7; }
    .fu-btn-cancel { background: transparent; color: #999; font-size: 15px; padding-bottom: 5px; }
    .fu-btn-backup { background: #fff0f3; color: #ff758f; border: 1px solid #ffe3e8; }
    .fu-btn-confirm { background: linear-gradient(135deg, #ff758f, #ff9eb5); color: #fff; box-shadow: 0 4px 15px rgba(255, 117, 143, 0.3); }
    
    .fu-progress-bar { width: 100%; height: 8px; background: #eee; border-radius: 4px; overflow: hidden; margin: 20px 0; }
    .fu-progress-fill { width: 0; height: 100%; background: linear-gradient(135deg, #ff758f, #ff9eb5); transition: width 0.2s ease; }
    `;
    document.head.appendChild(style);
  };

  // 创建备份提醒弹窗
  function _showBackupReminder() {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.id = 'force-update-overlay';
      overlay.innerHTML = `
        <div class="force-update-modal">
          <div class="fu-icon">⚠️</div>
          <div class="fu-title">更新前请先备份</div>
          <div class="fu-desc">
            更新会替换所有代码文件，<br>
            <strong>不会影响</strong>你的聊天记录、角色数据等。<br><br>
            但为了安全，建议你先去<br>
            <span style="color:#ff6b81;">设置 → 数据管理 → 导出所有数据</span><br>
            备份一份再更新。
          </div>
          <div class="fu-buttons">
            <button class="fu-btn fu-btn-cancel" id="fu-cancel">取消</button>
            <button class="fu-btn fu-btn-backup" id="fu-go-backup">去备份</button>
            <button class="fu-btn fu-btn-confirm" id="fu-confirm">已备份，开始更新</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      requestAnimationFrame(() => overlay.classList.add('show'));

      document.getElementById('fu-cancel').onclick = () => {
        _closeOverlay(overlay);
        resolve('cancel');
      };
      document.getElementById('fu-go-backup').onclick = () => {
        _closeOverlay(overlay);
        // 触发导出
        const exportBtn = document.getElementById('export-data-btn');
        if (exportBtn) exportBtn.click();
        resolve('backup');
      };
      document.getElementById('fu-confirm').onclick = () => {
        _closeOverlay(overlay);
        resolve('confirm');
      };
    });
  }

  // 显示更新进度弹窗
  function _showProgress() {
    const overlay = document.createElement('div');
    overlay.id = 'force-update-progress';
    overlay.innerHTML = `
      <div class="force-update-modal">
        <div class="fu-icon">🔄</div>
        <div class="fu-title">正在更新...</div>
        <div class="fu-progress-bar"><div class="fu-progress-fill" id="fu-progress-fill"></div></div>
        <div class="fu-status" id="fu-status-text">准备中...</div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    return {
      setProgress(percent, text) {
        const fill = document.getElementById('fu-progress-fill');
        const status = document.getElementById('fu-status-text');
        if (fill) fill.style.width = percent + '%';
        if (status) status.textContent = text;
      },
      close() { _closeOverlay(overlay); }
    };
  }

  // 显示结果弹窗
  function _showResult(success, message) {
    const overlay = document.createElement('div');
    overlay.id = 'force-update-result';
    overlay.innerHTML = `
      <div class="force-update-modal">
        <div class="fu-icon">${success ? '✅' : '❌'}</div>
        <div class="fu-title">${success ? '更新完成' : '更新失败'}</div>
        <div class="fu-desc">${message}</div>
        <div class="fu-buttons">
          <button class="fu-btn fu-btn-confirm" id="fu-result-ok">${success ? '刷新页面' : '关闭'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    document.getElementById('fu-result-ok').onclick = () => {
      _closeOverlay(overlay);
      if (success) {
        location.reload(true);
      }
    };
  }

  function _closeOverlay(el) {
    if (!el || !el.parentNode) return; // ★ 防重复调用
    el.classList.remove('show');
    setTimeout(() => {
      if (el.parentNode) el.remove(); // ★ 检查是否还在 DOM 里
    }, 300);
  }

  // 核心：执行强制更新
  async function _doUpdate() {
    const progress = _showProgress();
    let completed = 0;
    const total = FILES_TO_UPDATE.length + 2; // +2 for SW unregister + cache clear

    try {
      // Step 1: 注销 Service Worker
      progress.setProgress(5, '正在注销 Service Worker...');
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      completed++;
      progress.setProgress(Math.round(completed / total * 100), 'Service Worker 已注销');

      // Step 2: 清除所有缓存
      progress.setProgress(Math.round(completed / total * 100), '正在清除缓存...');
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
      completed++;
      progress.setProgress(Math.round(completed / total * 100), '缓存已清除');

      // Step 3: 强制重新拉取每个文件（带 cache-busting）
      const timestamp = Date.now();
      let failedFiles = [];

      // 打开专门的缓存空间用于强行注入
      const cache = await caches.open('app-cache-v3'); 

      for (const file of FILES_TO_UPDATE) {
        const url = `https://raw.githubusercontent.com/amanda-entropy/entropy-sanctum/revise/${file}?_force=${timestamp}`;
        progress.setProgress(
          Math.round(completed / total * 100),
          `正在更新: ${file}`
        );
        try {
          // 移除 no-cors，使用 cors 以获取透明响应
          const response = await fetch(url, { cache: 'no-store', mode: 'cors' });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          // 获取文本内容
          const text = await response.text();
          
          // 创建一个伪造的响应，绑定到本地路径
          const localUrl = new URL(file, location.origin).href;
          const fakeResponse = new Response(text, {
            status: 200,
            statusText: 'OK',
            headers: { 'Content-Type': file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'application/javascript' : 'text/html' }
          });
          
          // 强行把新代码塞进本地缓存
          await cache.put(localUrl, fakeResponse);
          
        } catch (e) {
          failedFiles.push(file);
          console.warn(`[ForceUpdate] 拉取或写入失败: ${file}`, e);
        }
        completed++;
      }

      progress.close();

      if (failedFiles.length > 0 && failedFiles.length < FILES_TO_UPDATE.length) {
        _showResult(true, `大部分文件已更新成功。<br>以下文件拉取失败（可能是网络问题）：<br><span style="font-size:11px;color:#999;">${failedFiles.join(', ')}</span><br><br>点击刷新页面加载最新版本。`);
      } else if (failedFiles.length === FILES_TO_UPDATE.length) {
        _showResult(false, '所有文件拉取失败，请检查网络连接后重试。');
      } else {
        _showResult(true, '所有文件已更新成功！<br>点击下方按钮刷新页面加载最新版本。');
      }

    } catch (err) {
      console.error('[ForceUpdate] 更新出错:', err);
      progress.close();
      _showResult(false, `更新过程中出错：<br>${err.message}<br><br>请检查网络后重试。`);
    }
  }

  // 公开方法：检查更新（入口）
  async function checkUpdate() {
    _injectStyles();
    const choice = await _showBackupReminder();
    if (choice === 'confirm') {
      await _doUpdate();
    }
    // cancel 和 backup 都不执行更新
  }

  return { checkUpdate };

})();

window.ForceUpdater = ForceUpdater;
