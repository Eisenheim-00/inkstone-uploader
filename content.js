// ================================================================
// Chapter Uploader - content.js
// Supports: Inkstone (inkstone.webnovel.com) + Royal Road (royalroad.com)
// Runs in MAIN world to access window.tinymce directly.
// ================================================================

(function () {
  'use strict';

  // ================================================================
  // PLATFORM DETECTION
  // ================================================================
  const PLATFORM = (() => {
    const host = window.location.hostname;
    if (host.includes('royalroad.com')) return 'royalroad';
    if (host.includes('webnovel.com'))  return 'inkstone';
    return 'unknown';
  })();

  const PLATFORM_CONFIG = {
    inkstone: {
      name: 'Inkstone',
      color: '#1a1a2e',
      hint: 'Click <strong>Create Chapter</strong> first, then load your <strong>.md</strong> files.',
      getTitleEl: () => document.querySelector('.input_title--plhUv, input[placeholder="Title Here"]'),
      // Inkstone: one TinyMCE editor, target it by active editor
      getBodyEditor: () => {
        if (typeof tinymce === 'undefined') return null;
        return tinymce.activeEditor || (tinymce.editors && tinymce.editors[0]) || null;
      },
      clickPublish: () => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.trim().toUpperCase() === 'PUBLISH');
        if (btn && !btn.disabled) { btn.click(); return true; }
        return false;
      },
      // Inkstone has a confirm modal after Publish
      needsConfirm: true,
      clickConfirm: () => {
        const btn = Array.from(document.querySelectorAll('button'))
          .find(b => b.textContent.trim().toUpperCase() === 'CONFIRM');
        if (btn) { btn.click(); return true; }
        return false;
      },
      // After confirm, Inkstone returns to novel overview — click Create Chapter
      afterPublish: async (delay, log, waitFor, sleep) => {
        log(`  ⏳ Waiting ${delay}ms for overview...`);
        await sleep(delay);
        log('  🆕 Clicking Create Chapter...');
        try {
          await waitFor(() => {
            const btn = Array.from(document.querySelectorAll('button, a'))
              .find(el => el.textContent.trim().toUpperCase().includes('CREATE CHAPTER'));
            if (btn) { btn.click(); return true; }
            return false;
          }, 8000);
        } catch { log('  ❌ "Create Chapter" button not found. Stopping.'); return false; }
        log('  ⏳ Waiting for chapter editor...');
        try {
          await waitFor(() => {
            const cfg = PLATFORM_CONFIG.inkstone;
            return cfg.getTitleEl() !== null && document.querySelector('iframe.tox-edit-area__iframe') !== null;
          }, 10000);
        } catch { log('  ⚠ Editor did not load. Stopping.'); return false; }
        await sleep(800);
        return true;
      },
    },

    royalroad: {
      name: 'Royal Road',
      color: '#1a1a2e',
      hint: 'You\'re on the Royal Road chapter editor. Load your <strong>.md</strong> files and go!',
      getTitleEl: () => document.querySelector('#Title, input[placeholder="Title of chapter"]'),
      // Royal Road has 3 TinyMCE instances: PreAuthorNotes, contentEditor, PostAuthorNotes
      // We target the main content editor specifically by its textarea id
      getBodyEditor: () => {
        if (typeof tinymce === 'undefined') return null;
        // Find the editor associated with contentEditor textarea
        const editors = tinymce.editors || [];
        const content = editors.find(e => e.id === 'contentEditor' || e.targetElm?.id === 'contentEditor');
        if (content) return content;
        // Fallback: pick the largest editor (most likely the chapter body)
        if (editors.length > 0) {
          return editors.reduce((best, ed) => {
            const bh = best.getContainer()?.offsetHeight || 0;
            const eh = ed.getContainer()?.offsetHeight || 0;
            return eh > bh ? ed : best;
          });
        }
        return null;
      },
      clickPublish: () => {
        // Save session BEFORE form submits — JS dies the moment the form goes through
        // We hook beforeunload to do a last-second sessionStorage save
        const match = window.location.href.match(/\/chapters\/(?:new|edit)\/(\d+)/);
        const fictionId = match ? match[1] : null;
        if (fictionId) sessionStorage.setItem('icu_fictionid', fictionId);

        const btn = Array.from(document.querySelectorAll('button[type="submit"]'))
          .find(b => b.value === 'publish' || b.textContent.trim().toUpperCase().includes('PUBLISH CHAPTER'));
        if (btn) { btn.click(); return true; }
        return false;
      },
      // Royal Road submits a form — no confirm modal
      needsConfirm: false,
      clickConfirm: () => true,
      // afterPublish is never really reached since the form causes a full page reload.
      // The session is saved via beforeunload (see setupRoyalRoadUnloadSave below),
      // and the new page auto-resumes via loadSession() on boot.
      afterPublish: async (delay, log, waitFor, sleep) => {
        return true; // no-op: unload handler and boot restore handle everything
      },
    },
  };

  const cfg = PLATFORM_CONFIG[PLATFORM] || PLATFORM_CONFIG.inkstone;

  // ================================================================
  // STATE — persisted across page navigations for Royal Road
  // ================================================================
  let files = [];
  let currentIndex = 0;
  let stopRequested = false;

  // Royal Road navigates to a new page between chapters.
  // We encode file contents into sessionStorage before navigating,
  // then restore them on the next page load.
  function saveSession(delay) {
    if (PLATFORM !== 'royalroad') return;
    const fileData = files.slice(currentIndex).map(f => ({
      name: f.name,
      // store as data URL via FileReader — but since we can't await here,
      // we use a sync-friendly approach: store the already-read text
      // (files are read at fill time, so we re-read and store below)
    }));
    sessionStorage.setItem('icu_delay', delay);
    sessionStorage.setItem('icu_total', files.length);
    sessionStorage.setItem('icu_index', currentIndex);
  }

  async function saveFilesToSession(delay) {
    const match = window.location.href.match(/\/chapters\/(?:new|edit)\/(\d+)/);
    const fictionId = match ? match[1] : null;
    if (fictionId) sessionStorage.setItem('icu_fictionid', fictionId);
    sessionStorage.setItem('icu_delay', delay);
    sessionStorage.setItem('icu_usefilename', document.getElementById('icu-use-filename').checked);
    sessionStorage.setItem('icu_running', 'true');
    // Store remaining file contents — slice from currentIndex+1
    // because currentIndex is being published right now
    const remaining = files.slice(currentIndex + 1);
    const contents = [];
    for (const f of remaining) {
      const text = await readFileAsText(f);
      contents.push({ name: f.name, text });
    }
    sessionStorage.setItem('icu_files', JSON.stringify(contents));
  }

  function loadSession() {
    if (PLATFORM !== 'royalroad') return false;
    if (sessionStorage.getItem('icu_running') !== 'true') return false;

    try {
      const stored = JSON.parse(sessionStorage.getItem('icu_files') || '[]');
      if (!stored.length) return false;

      // Reconstruct as Blob-based File objects
      files = stored.map(f => new File([f.text], f.name, { type: 'text/plain' }));
      currentIndex = 0; // always start from 0 since we sliced at save time
      sessionStorage.removeItem('icu_running');
      sessionStorage.removeItem('icu_files');
      return true;
    } catch (e) {
      return false;
    }
  }

  // ================================================================
  // BOOT
  // ================================================================
  const bootInterval = setInterval(() => {
    if (document.getElementById('icu-panel')) return;
    injectPanel();
    clearInterval(bootInterval);
    // Royal Road: check if we landed on a non-editor page after publish
    // (e.g. chapter preview) and need to redirect to the new chapter editor
    if (PLATFORM === 'royalroad') {
      const pendingFictionId = sessionStorage.getItem('icu_fictionid');
      const hasSession = sessionStorage.getItem('icu_running') === 'true';
      const onEditorPage = !!document.querySelector('#Title, input[placeholder="Title of chapter"]');

      if (hasSession && pendingFictionId && !onEditorPage) {
        // We're on a non-editor page (preview/homepage) — redirect to new chapter editor
        sessionStorage.removeItem('icu_fictionid');
        window.location.href = `https://www.royalroad.com/author-dashboard/chapters/new/${pendingFictionId}`;
        return;
      }

      if (loadSession()) {
        renderFileList();
        log(`🔄 Resuming auto-upload (${files.length} chapter(s) remaining)...`);
        setTimeout(() => startAutoUpload(), 1500);
      }
    }
  }, 1000);

  // Royal Road: save session to sessionStorage right before page unloads
  // This fires when the publish form submits and the page navigates away
  function setupRoyalRoadUnloadSave() {
    if (PLATFORM !== 'royalroad') return;
    window.addEventListener('beforeunload', () => {
      if (files.length > 0 && currentIndex < files.length) {
        const delay = parseInt(document.getElementById('icu-delay')?.value || '2000');
        // Synchronously save what we can — beforeunload must be sync
        sessionStorage.setItem('icu_delay', delay);
        sessionStorage.setItem('icu_usefilename', document.getElementById('icu-use-filename')?.checked);
        sessionStorage.setItem('icu_running', 'true');
        // Note: file contents were already saved async when fill ran — see saveFilesToSession
      }
    });
  }

  // ================================================================
  // PANEL
  // ================================================================
  function injectPanel() {
    const panel = document.createElement('div');
    panel.id = 'icu-panel';
    panel.innerHTML = `
      <div id="icu-header">
        📂 Chapter Uploader
        <span id="icu-platform-badge">${cfg.name}</span>
        <button id="icu-minimize" title="Minimize">—</button>
      </div>
      <div id="icu-body">
        <p class="icu-hint">${cfg.hint}</p>

        <label class="icu-label">Select .md files:</label>
        <input type="file" id="icu-file-input" accept=".md" multiple />
        <div id="icu-file-list"></div>

        <label class="icu-label">
          <input type="checkbox" id="icu-use-filename" checked />
          Use filename as chapter title
        </label>

        <label class="icu-label">
          Delay between chapters (ms):
          <input type="number" id="icu-delay" value="2000" min="800" max="15000" step="100" />
        </label>

        <div id="icu-actions">
          <button id="icu-debug-btn">🔍 Debug Editor</button>
          <button id="icu-fill-btn" disabled>⬇ Fill This Chapter Only</button>
          <button id="icu-auto-btn" disabled>▶ Auto-Upload All Chapters</button>
          <button id="icu-stop-btn" style="display:none">⏹ Stop After This Chapter</button>
        </div>

        <div id="icu-log-header" style="display:none">
          <span>Log</span>
          <button id="icu-copy-log">📋 Copy Log</button>
          <button id="icu-clear-log">✕ Clear</button>
        </div>
        <div id="icu-log"></div>
      </div>
    `;
    document.body.appendChild(panel);

    makeDraggable(panel, document.getElementById('icu-header'));
    document.getElementById('icu-minimize').addEventListener('click', toggleMinimize);
    document.getElementById('icu-file-input').addEventListener('change', onFilesSelected);
    document.getElementById('icu-debug-btn').addEventListener('click', runDebug);
    document.getElementById('icu-fill-btn').addEventListener('click', () => fillChapter());
    document.getElementById('icu-auto-btn').addEventListener('click', startAutoUpload);
    document.getElementById('icu-stop-btn').addEventListener('click', requestStop);
    document.getElementById('icu-copy-log').addEventListener('click', copyLog);
    document.getElementById('icu-clear-log').addEventListener('click', clearLog);
  }

  // ================================================================
  // DEBUG
  // ================================================================
  async function runDebug() {
    log(`🔍 Debug check (${cfg.name})...`);
    if (typeof tinymce !== 'undefined') {
      log(`  ✅ tinymce found, ${tinymce.editors?.length || 0} editor(s)`);
      tinymce.editors?.forEach((e, i) => log(`    [${i}] id: ${e.id}, height: ${e.getContainer()?.offsetHeight}px`));
    } else {
      log('  ❌ tinymce NOT found');
    }
    const editor = cfg.getBodyEditor();
    log(`  Body editor: ${editor ? '✅ ' + editor.id : '❌ not found'}`);
    const titleEl = cfg.getTitleEl();
    log(`  Title field: ${titleEl ? '✅ ' + (titleEl.id || titleEl.className) : '❌ not found'}`);
  }

  // ================================================================
  // FILES
  // ================================================================
  function onFilesSelected(e) {
    files = Array.from(e.target.files).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    currentIndex = 0;
    renderFileList();
    const hasFiles = files.length > 0;
    document.getElementById('icu-fill-btn').disabled = !hasFiles;
    document.getElementById('icu-auto-btn').disabled = !hasFiles;
    if (hasFiles) log(`✅ ${files.length} file(s) loaded.`);
  }

  function renderFileList() {
    const el = document.getElementById('icu-file-list');
    el.innerHTML = '';
    if (!files.length) { el.classList.remove('has-files'); return; }
    el.classList.add('has-files');
    files.forEach((f, i) => {
      const item = document.createElement('div');
      item.className = 'icu-file-item' + (i === currentIndex ? ' active' : '');
      item.id = `icu-f-${i}`;
      item.textContent = `${i + 1}. ${f.name}`;
      el.appendChild(item);
    });
  }

  function markFileDone(index, success) {
    const el = document.getElementById(`icu-f-${index}`);
    if (el) { el.classList.remove('active'); el.classList.add(success ? 'done' : 'error'); }
  }

  function markFileActive(index) {
    document.querySelectorAll('.icu-file-item').forEach(el => el.classList.remove('active'));
    const el = document.getElementById(`icu-f-${index}`);
    if (el) el.classList.add('active');
  }

  // ================================================================
  // MARKDOWN
  // ================================================================
  function parseMarkdown(text) {
    const lines = text.split('\n');
    let title = '', bodyLines = [], found = false;
    for (const line of lines) {
      if (!found && line.startsWith('# ')) { title = line.replace(/^#\s+/, '').trim(); found = true; }
      else bodyLines.push(line);
    }
    while (bodyLines.length && !bodyLines[0].trim()) bodyLines.shift();
    return { title, body: bodyLines.join('\n').trim() };
  }

  function stripMarkdown(text) {
    return text
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')
      .replace(/~~(.+?)~~/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\[(.+?)\]\(.+?\)/g, '$1')
      .replace(/!\[.*?\]\(.+?\)/g, '')
      .replace(/^>\s+/gm, '')
      .replace(/^---+$/gm, '')
      .trim();
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Failed to read: ' + file.name));
      reader.readAsText(file, 'UTF-8');
    });
  }

  // ================================================================
  // TITLE
  // ================================================================
  function setTitle(el, value) {
    el.focus();
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  // ================================================================
  // BODY — plain text paste into TinyMCE
  // ================================================================
  async function setBody(text) {
    let editor = cfg.getBodyEditor();
    if (!editor) {
      log('  ⏳ Waiting for TinyMCE...');
      await sleep(1500);
      editor = cfg.getBodyEditor();
    }
    if (!editor) {
      log('  ❌ TinyMCE editor not found. Run 🔍 Debug for details.');
      return false;
    }

    try {
      editor.execCommand('selectAll');
      editor.execCommand('Delete');
      editor.getBody().focus();

      const dt = new DataTransfer();
      dt.setData('text/plain', text);
      editor.getBody().dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true, cancelable: true, clipboardData: dt,
      }));
      editor.fire('change');
      log('  📝 Body filled via plain text paste');
      return true;
    } catch (e) {
      log(`  ⚠ Paste failed: ${e.message}, trying fallback...`);
      try {
        editor.execCommand('selectAll');
        editor.execCommand('Delete');
        editor.insertContent(
          text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
        );
        editor.fire('change');
        log('  📝 Body filled via insertContent fallback');
        return true;
      } catch (e2) {
        log(`  ❌ Body fill failed: ${e2.message}`);
        return false;
      }
    }
  }

  // ================================================================
  // HELPERS
  // ================================================================
  function waitFor(fn, timeout = 8000, interval = 200) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const t = setInterval(() => {
        if (fn()) { clearInterval(t); resolve(); }
        else if (Date.now() - start > timeout) { clearInterval(t); reject(new Error('Timeout')); }
      }, interval);
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ================================================================
  // FILL CHAPTER
  // ================================================================
  async function fillChapter() {
    if (!files.length || currentIndex >= files.length) { log('⚠ No files remaining.'); return false; }

    const file = files[currentIndex];
    log(`📄 Processing: ${file.name}`);

    let rawText;
    try { rawText = await readFileAsText(file); }
    catch (e) { log(`❌ Could not read file: ${e.message}`); return false; }

    const useFilename = document.getElementById('icu-use-filename').checked;
    const parsed = parseMarkdown(rawText);
    const title = useFilename ? file.name.replace(/\.md$/i, '') : (parsed.title || file.name.replace(/\.md$/i, ''));
    const body = stripMarkdown(parsed.body || rawText);

    const titleEl = cfg.getTitleEl();
    if (!titleEl) { log('⚠ Title field not found. Are you on the chapter editor page?'); return false; }
    setTitle(titleEl, title);
    log(`  ✏ Title: "${title}"`);

    await sleep(400);

    const ok = await setBody(body);
    if (!ok) return false;

    await sleep(300);
    return true;
  }

  // ================================================================
  // AUTO UPLOAD
  // ================================================================
  async function startAutoUpload() {
    if (!files.length) return;
    stopRequested = false;
    setButtons(true);
    log(`🚀 Auto-uploading ${files.length - currentIndex} chapter(s) on ${cfg.name}...`);
    const delay = parseInt(document.getElementById('icu-delay').value) || 2000;
    if (PLATFORM === 'royalroad') setupRoyalRoadUnloadSave();

    while (currentIndex < files.length) {
      if (stopRequested) { log('⏹ Stopped.'); break; }
      markFileActive(currentIndex);

      const ok = await fillChapter();
      if (!ok) { markFileDone(currentIndex, false); currentIndex++; continue; }

      await sleep(600);

      // Royal Road: save session NOW before the form submit kills the page
      if (PLATFORM === 'royalroad') {
        log('  💾 Saving session before publish...');
        await saveFilesToSession(delay);
      }

      log('  🔵 Clicking Publish...');
      if (!cfg.clickPublish()) {
        await sleep(1000);
        if (!cfg.clickPublish()) { log('  ❌ Publish button not found. Stopping.'); markFileDone(currentIndex, false); break; }
      }

      // Inkstone needs confirm modal; Royal Road submits directly
      if (cfg.needsConfirm) {
        log('  ⏳ Waiting for confirm modal...');
        try {
          await waitFor(() => Array.from(document.querySelectorAll('button'))
            .some(b => b.textContent.trim().toUpperCase() === 'CONFIRM'), 6000);
        } catch { log('  ❌ Confirm modal never appeared. Stopping.'); markFileDone(currentIndex, false); break; }
        await sleep(400);
        cfg.clickConfirm();
      }

      markFileDone(currentIndex, true);
      log(`  🎉 "${files[currentIndex].name}" published!`);
      currentIndex++;

      if (currentIndex >= files.length) { log('🏁 All done!'); break; }
      if (stopRequested) { log('⏹ Stopped.'); break; }

      // Platform-specific: navigate to next chapter editor
      const continued = await cfg.afterPublish(delay, log, waitFor, sleep);
      if (!continued) break;

      log(`  ➡ Next: chapter ${currentIndex + 1}`);
      await sleep(500);
    }

    setButtons(false);
  }

  function requestStop() { stopRequested = true; log('⏹ Stop requested...'); }

  function setButtons(running) {
    document.getElementById('icu-fill-btn').disabled = running;
    document.getElementById('icu-auto-btn').disabled = running;
    document.getElementById('icu-stop-btn').style.display = running ? 'block' : 'none';
  }

  // ================================================================
  // LOG
  // ================================================================
  function log(msg) {
    const el = document.getElementById('icu-log');
    const hdr = document.getElementById('icu-log-header');
    if (!el) return;
    el.classList.add('has-logs');
    hdr.style.display = 'flex';
    const line = document.createElement('div');
    line.className = 'icu-log-line';
    line.textContent = msg;
    line.title = 'Click to copy this line';
    line.addEventListener('click', () => {
      navigator.clipboard.writeText(msg).then(() => {
        line.classList.add('copied');
        setTimeout(() => line.classList.remove('copied'), 800);
      });
    });
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  }

  function copyLog() {
    const lines = Array.from(document.querySelectorAll('.icu-log-line')).map(l => l.textContent);
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      const btn = document.getElementById('icu-copy-log');
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy Log', 1500);
    });
  }

  function clearLog() {
    const el = document.getElementById('icu-log');
    el.innerHTML = '';
    el.classList.remove('has-logs');
    document.getElementById('icu-log-header').style.display = 'none';
  }

  // ================================================================
  // UI HELPERS
  // ================================================================
  function toggleMinimize() {
    const body = document.getElementById('icu-body');
    const btn = document.getElementById('icu-minimize');
    body.classList.toggle('hidden');
    btn.textContent = body.classList.contains('hidden') ? '＋' : '—';
  }

  function makeDraggable(panel, handle) {
    let sx, sy, sl, st;
    handle.addEventListener('mousedown', e => {
      sx = e.clientX; sy = e.clientY;
      const r = panel.getBoundingClientRect();
      sl = r.left; st = r.top;
      const move = e => {
        panel.style.left = (sl + e.clientX - sx) + 'px';
        panel.style.top = (st + e.clientY - sy) + 'px';
        panel.style.right = 'auto';
      };
      const up = () => {
        document.removeEventListener('mousemove', move);
        document.removeEventListener('mouseup', up);
      };
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
    });
  }

})();
