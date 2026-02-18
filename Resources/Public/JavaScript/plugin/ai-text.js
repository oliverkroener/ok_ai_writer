import * as Core from '@ckeditor/ckeditor5-core';
import * as UI from '@ckeditor/ckeditor5-ui';

// Sparkle/AI icon (toolbar button)
const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>';

const STORAGE_KEY_ENDPOINT = 'typo3_ai_text_endpoint';
const STORAGE_KEY_APIKEY = 'typo3_ai_text_apikey';
const STORAGE_KEY_MODE = 'typo3_ai_text_mode';
const STORAGE_KEY_MODEL = 'typo3_ai_text_model';

function escapeAttr(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function lang(key, fallback) {
  return window.TYPO3?.lang?.[key] ?? fallback;
}

function getConfig() {
  return window.TYPO3?.settings?.ok_ai_writer ?? {};
}

function isDarkMode() {
  const scheme = document.documentElement.getAttribute('data-color-scheme');
  if (scheme === 'dark') return true;
  if (scheme === 'light') return false;
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false;
}

function getTheme() {
  return isDarkMode() ? {
    bg: '#1e1e2e',
    text: '#d4d4e0',
    border: '#3d3d50',
    panelBg: '#252538',
    inputBg: '#2a2a3d',
    inputBorder: '#7a7a90',
    muted: '#9e9eb0',
    label: '#b0b0c0',
    buttonColor: '#b0b0c0',
    hoverBg: '#2d2d42',
    hoverText: '#d4d4e0',
    shadow: 'rgba(0,0,0,.6)',
    accent: '#a78bfa',
    accentBg: '#2e1065',
    successBg: '#0f2a1a',
    successBorder: '#1a4a2a',
    successText: '#4ade80',
    successIcon: '#4ade80',
    codeBg: '#2a2a3d',
    emptyIcon: '#3d3d50',
    tooltipBg: '#e0e0e0',
    tooltipText: '#1e1e2e',
  } : {
    bg: '#fff',
    text: '#333',
    border: '#e5e5e5',
    panelBg: '#fafafa',
    inputBg: '#fafafa',
    inputBorder: '#949494',
    muted: '#767676',
    label: '#555',
    buttonColor: '#555',
    hoverBg: '#f0f0f0',
    hoverText: '#555',
    shadow: 'rgba(0,0,0,.3)',
    accent: '#7c3aed',
    accentBg: '#f3e8ff',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',
    successText: '#15803d',
    successIcon: '#16a34a',
    codeBg: '#e5e7eb',
    emptyIcon: '#ddd',
    tooltipBg: '#333',
    tooltipText: '#fff',
  };
}

function createOverlay(editor) {
  const config = getConfig();
  const devMode = config.devMode ?? false;
  const serverMode = config.mode ?? 'azure';
  const serverModel = config.model ?? 'gpt-4o';
  const hasCredentials = config.hasCredentials ?? false;
  const apiUrlBlinded = config.apiUrlBlinded ?? '';
  const apiKeyBlinded = config.apiKeyBlinded ?? '';

  const savedEndpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT) || '';
  const savedApiKey = localStorage.getItem(STORAGE_KEY_APIKEY) || '';
  const savedMode = localStorage.getItem(STORAGE_KEY_MODE) || '';
  const savedModel = localStorage.getItem(STORAGE_KEY_MODEL) || '';

  // Effective mode: devMode localStorage > server config
  const effectiveMode = devMode && savedMode ? savedMode : serverMode;

  // Theme colors
  const t = getTheme();

  // Save cursor position before dialog steals focus
  const savedSelection = Array.from(editor.model.document.selection.getRanges());

  let conversationMessages = [];
  let generatedHtml = '';
  let isGenerating = false;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:90000;display:flex;align-items:center;justify-content:center;';

  const dialog = document.createElement('div');
  dialog.style.cssText = `background:${t.bg};border-radius:12px;width:680px;max-width:90vw;height:70vh;max-height:85vh;box-shadow:0 25px 60px ${t.shadow};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:${t.text};display:flex;flex-direction:column;overflow:hidden;`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', lang('aitext.dialog.title', 'AI Text Generator'));

  // Build settings panel HTML based on devMode
  let settingsPanelHtml = '';
  if (devMode) {
    // Full editable settings panel
    settingsPanelHtml = `
      <div data-settings-panel style="display:none;padding:16px 20px;background:${t.panelBg};border-bottom:1px solid ${t.border};flex-shrink:0;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${t.accent};background:${t.accentBg};padding:2px 8px;border-radius:4px;">DEV</span>
          <span style="font-size:12px;color:${t.muted};">${lang('aitext.settings.devmode', 'Developer Mode — credentials can be overridden')}</span>
        </div>
        <div style="display:grid;gap:10px;">
          <div>
            <label for="ai-text-mode" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.mode', 'API Mode')}</label>
            <select id="ai-text-mode" data-field="mode" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};">
              <option value="azure" ${effectiveMode === 'azure' ? 'selected' : ''}>Azure OpenAI</option>
              <option value="openai" ${effectiveMode === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
            </select>
          </div>
          <div>
            <label for="ai-text-endpoint" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.endpoint', 'Endpoint URL')}</label>
            <input id="ai-text-endpoint" data-field="endpoint" type="url" placeholder="${effectiveMode === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://your-resource.openai.azure.com/openai/deployments/...'}" value="${escapeAttr(savedEndpoint)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
            ${apiUrlBlinded ? `<div style="font-size:11px;color:${t.muted};margin-top:2px;">${lang('aitext.settings.serverValue', 'Server')}: ${escapeAttr(apiUrlBlinded)}</div>` : ''}
          </div>
          <div>
            <label for="ai-text-apikey" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.apikey', 'API Key')}</label>
            <input id="ai-text-apikey" data-field="apikey" type="password" placeholder="${lang('aitext.settings.apikeyPlaceholder', 'Your API key')}" value="${escapeAttr(savedApiKey)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
            ${apiKeyBlinded ? `<div style="font-size:11px;color:${t.muted};margin-top:2px;">${lang('aitext.settings.serverValue', 'Server')}: ${escapeAttr(apiKeyBlinded)}</div>` : ''}
          </div>
          <div data-model-row style="display:${effectiveMode === 'openai' ? 'block' : 'none'};">
            <label for="ai-text-model" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.model', 'Model')}</label>
            <input id="ai-text-model" data-field="model" type="text" placeholder="gpt-4o" value="${escapeAttr(savedModel || serverModel)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
          </div>
        </div>
      </div>`;
  } else {
    // Read-only info panel
    const modeLabel = serverMode === 'openai' ? 'OpenAI (ChatGPT)' : 'Azure OpenAI';
    settingsPanelHtml = `
      <div data-settings-panel style="display:none;padding:14px 20px;background:${t.successBg};border-bottom:1px solid ${t.successBorder};flex-shrink:0;">
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" fill="${t.successIcon}" style="flex-shrink:0;margin-top:1px;" aria-hidden="true"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:600;color:${t.successText};margin-bottom:6px;">${lang('aitext.settings.configured', 'API credentials configured by administrator.')}</div>
            <div style="display:grid;gap:4px;font-size:12px;color:${t.label};">
              <div><span style="font-weight:600;">${lang('aitext.settings.mode', 'API Mode')}:</span> ${modeLabel}</div>
              ${apiUrlBlinded ? `<div><span style="font-weight:600;">${lang('aitext.settings.endpoint', 'Endpoint URL')}:</span> <code style="font-size:11px;background:${t.codeBg};padding:1px 4px;border-radius:3px;">${escapeAttr(apiUrlBlinded)}</code></div>` : ''}
              ${apiKeyBlinded ? `<div><span style="font-weight:600;">${lang('aitext.settings.apikey', 'API Key')}:</span> <code style="font-size:11px;background:${t.codeBg};padding:1px 4px;border-radius:3px;">${escapeAttr(apiKeyBlinded)}</code></div>` : ''}
              ${serverMode === 'openai' ? `<div><span style="font-weight:600;">${lang('aitext.settings.model', 'Model')}:</span> ${escapeAttr(serverModel)}</div>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  dialog.innerHTML = `
    <style>
      @keyframes ai-dot-pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      [data-tooltip]{position:relative;}
      [data-tooltip]::after{content:attr(data-tooltip);position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%) scale(.9);background:${t.tooltipBg};color:${t.tooltipText};font-size:13px;font-weight:500;padding:5px 10px;border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;z-index:1;}
      [data-tooltip]:hover::after{opacity:1;transform:translateX(-50%) scale(1);}
      [data-action="settings"]:hover,[data-action="maximize"]:hover,[data-action="close"]:hover{background:${t.hoverBg} !important;color:${t.hoverText} !important;box-shadow:0 1px 3px rgba(0,0,0,.12);}
      [data-action="settings"]:focus-visible,[data-action="maximize"]:focus-visible,[data-action="close"]:focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}
      [data-action="insert"]:hover{background:#6d28d9 !important;box-shadow:0 2px 8px rgba(124,58,237,.35);}
      [data-action="insert"]:focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}
      [data-action="generate"]:hover{background:#6d28d9 !important;box-shadow:0 2px 8px rgba(124,58,237,.35);}
      [data-action="generate"]:focus-visible{outline:2px solid #fff;outline-offset:-4px;}
      [data-settings-panel] input:focus,[data-settings-panel] select:focus{border-color:#7c3aed !important;box-shadow:0 0 0 2px rgba(124,58,237,.25);}
      [data-field="prompt"]:focus{outline:none;}
    </style>

    <!-- Header -->
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid ${t.border};flex-shrink:0;">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="#7c3aed" aria-hidden="true"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>
        <h2 style="margin:0;font-size:16px;font-weight:600;">${lang('aitext.dialog.title', 'AI Text Generator')}</h2>
      </div>
      <div style="display:flex;align-items:center;gap:2px;">
        <button data-action="settings" aria-label="${lang('aitext.dialog.settings', 'Settings')}" data-tooltip="${lang('aitext.dialog.settings', 'Settings')}" style="background:none;border:none;font-size:18px;cursor:pointer;color:${t.buttonColor};padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&#9881;</button>
        <button data-action="maximize" aria-label="${lang('aitext.dialog.maximize', 'Maximize')}" data-tooltip="${lang('aitext.dialog.maximize', 'Maximize')}" style="background:none;border:none;font-size:16px;cursor:pointer;color:${t.buttonColor};padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&#9744;</button>
        <button data-action="close" aria-label="${lang('aitext.dialog.close', 'Close')}" data-tooltip="${lang('aitext.dialog.close', 'Close')}" style="background:none;border:none;font-size:22px;cursor:pointer;color:${t.buttonColor};padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&times;</button>
      </div>
    </div>

    ${settingsPanelHtml}

    <!-- Output area (scrollable, takes remaining space) -->
    <div data-output-area style="flex:1;overflow-y:auto;padding:24px 20px;">
      <div data-empty-state style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;color:${t.muted};padding:40px 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="40" height="40" fill="${t.emptyIcon}" style="margin-bottom:16px;" aria-hidden="true"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>
        <p style="font-size:15px;font-weight:500;margin:0 0 6px;color:${t.muted};">${lang('aitext.empty.title', 'What would you like to write?')}</p>
        <p style="font-size:13px;margin:0;color:${t.muted};">${lang('aitext.empty.description', 'Describe your text below and the AI will generate it for you.')}</p>
      </div>
      <div data-generated-content style="display:none;font-size:14px;line-height:1.7;"></div>
      <div data-loading style="display:none;padding:16px 0;" role="status" aria-live="polite">
        <div style="display:flex;align-items:center;gap:10px;color:${t.muted};">
          <span style="display:flex;gap:4px;" aria-hidden="true">
            <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s ease-in-out infinite;"></span>
            <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s .15s ease-in-out infinite;"></span>
            <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s .3s ease-in-out infinite;"></span>
          </span>
          <span style="font-size:13px;">${lang('aitext.loading', 'Generating...')}</span>
        </div>
      </div>
    </div>

    <!-- Insert bar (shown when text is available) -->
    <div data-insert-bar style="display:none;padding:0 20px 4px;flex-shrink:0;">
      <button data-action="insert" style="width:100%;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,box-shadow .15s;">${lang('aitext.insert', 'Insert into Editor')}</button>
    </div>

    <!-- Input area (fixed at bottom) -->
    <div style="padding:12px 20px 16px;border-top:1px solid ${t.border};flex-shrink:0;">
      <div data-input-container style="display:flex;align-items:flex-end;gap:8px;border:1.5px solid ${t.inputBorder};border-radius:12px;padding:8px 8px 8px 16px;background:${t.inputBg};transition:border-color .15s;">
        <textarea data-field="prompt" rows="1" aria-label="${lang('aitext.prompt.label', 'AI text prompt')}" placeholder="${lang('aitext.prompt.placeholder', 'Describe the text you want to generate...')}" style="flex:1;border:none;background:transparent;resize:none;font-size:14px;line-height:1.5;font-family:inherit;outline:none;max-height:120px;padding:4px 0;overflow-y:auto;color:${t.text};"></textarea>
        <button data-action="generate" aria-label="${lang('aitext.send', 'Send (Enter)')}" title="${lang('aitext.send', 'Send (Enter)')}" style="flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s,background .15s,box-shadow .15s;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
        </button>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 4px 0;min-height:16px;">
        <div data-status style="font-size:12px;" role="status" aria-live="polite"></div>
        <div data-token-stats style="font-size:11px;color:${t.muted};display:none;">
          <span data-tokens-in title="Input tokens">0</span> ${lang('aitext.tokens.in', 'in')} / <span data-tokens-out title="Output tokens">0</span> ${lang('aitext.tokens.out', 'out')}
        </div>
      </div>
    </div>
  `;

  overlay.appendChild(dialog);

  // --- Element references ---
  const promptInput = dialog.querySelector('[data-field="prompt"]');
  const outputArea = dialog.querySelector('[data-output-area]');
  const emptyState = dialog.querySelector('[data-empty-state]');
  const generatedContent = dialog.querySelector('[data-generated-content]');
  const loadingEl = dialog.querySelector('[data-loading]');
  const statusDiv = dialog.querySelector('[data-status]');
  const generateBtn = dialog.querySelector('[data-action="generate"]');
  const insertBar = dialog.querySelector('[data-insert-bar]');
  const insertBtn = dialog.querySelector('[data-action="insert"]');
  const settingsPanel = dialog.querySelector('[data-settings-panel]');
  const settingsBtn = dialog.querySelector('[data-action="settings"]');
  const inputContainer = dialog.querySelector('[data-input-container]');
  const tokenStats = dialog.querySelector('[data-token-stats]');
  const tokensInEl = dialog.querySelector('[data-tokens-in]');
  const tokensOutEl = dialog.querySelector('[data-tokens-out]');
  const maximizeBtn = dialog.querySelector('[data-action="maximize"]');

  // Dev mode specific elements
  const endpointInput = dialog.querySelector('[data-field="endpoint"]');
  const apikeyInput = dialog.querySelector('[data-field="apikey"]');
  const modeSelect = dialog.querySelector('[data-field="mode"]');
  const modelInput = dialog.querySelector('[data-field="model"]');
  const modelRow = dialog.querySelector('[data-model-row]');

  // Show settings on first use if devMode and no credentials configured
  if (devMode && !savedEndpoint && !savedApiKey && !hasCredentials) {
    settingsPanel.style.display = 'block';
  }

  // Show missing credentials error if not devMode and no server credentials
  if (!devMode && !hasCredentials) {
    settingsPanel.style.display = 'block';
  }

  // --- Mode selector toggle (devMode only) ---
  if (devMode && modeSelect && modelRow) {
    modeSelect.addEventListener('change', () => {
      const isOpenAI = modeSelect.value === 'openai';
      modelRow.style.display = isOpenAI ? 'block' : 'none';
      if (endpointInput && !endpointInput.value) {
        endpointInput.placeholder = isOpenAI
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://your-resource.openai.azure.com/openai/deployments/...';
      }
    });
  }

  // --- Close ---
  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onEsc);
    editor.editing.view.focus();
  }

  function onEsc(e) {
    if (e.key === 'Escape') close();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  dialog.querySelector('[data-action="close"]').addEventListener('click', close);
  document.addEventListener('keydown', onEsc);

  // Toggle settings panel
  settingsBtn.addEventListener('click', () => {
    const visible = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = visible ? 'none' : 'block';
  });

  // Toggle maximize/restore
  let isMaximized = false;
  maximizeBtn.addEventListener('click', () => {
    isMaximized = !isMaximized;
    if (isMaximized) {
      dialog.style.width = '100vw';
      dialog.style.height = '100vh';
      dialog.style.maxWidth = '100vw';
      dialog.style.maxHeight = '100vh';
      dialog.style.borderRadius = '0';
      maximizeBtn.innerHTML = '&#9723;';
      maximizeBtn.dataset.tooltip = lang('aitext.dialog.restore', 'Restore');
      maximizeBtn.setAttribute('aria-label', lang('aitext.dialog.restore', 'Restore'));
    } else {
      dialog.style.width = '680px';
      dialog.style.height = '70vh';
      dialog.style.maxWidth = '90vw';
      dialog.style.maxHeight = '85vh';
      dialog.style.borderRadius = '12px';
      maximizeBtn.innerHTML = '&#9744;';
      maximizeBtn.dataset.tooltip = lang('aitext.dialog.maximize', 'Maximize');
      maximizeBtn.setAttribute('aria-label', lang('aitext.dialog.maximize', 'Maximize'));
    }
  });

  // Auto-resize textarea
  function autoResize() {
    promptInput.style.height = 'auto';
    promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
  }
  promptInput.addEventListener('input', autoResize);

  // Input focus styling
  promptInput.addEventListener('focus', () => { inputContainer.style.borderColor = '#7c3aed'; });
  promptInput.addEventListener('blur', () => { inputContainer.style.borderColor = t.inputBorder; });

  // --- Generate ---
  async function generate() {
    if (isGenerating) return;

    const prompt = promptInput.value.trim();
    if (!prompt) return;

    // Build request body
    const requestBody = {};

    // Include siteRootPageId for per-site credential resolution
    const siteRootPageId = config.siteRootPageId ?? 0;
    if (siteRootPageId > 0) {
      requestBody.siteRootPageId = siteRootPageId;
    }

    if (devMode) {
      // In dev mode, read from form fields and save to localStorage
      const endpoint = endpointInput ? endpointInput.value.trim() : '';
      const apikey = apikeyInput ? apikeyInput.value.trim() : '';
      const mode = modeSelect ? modeSelect.value : serverMode;
      const model = modelInput ? modelInput.value.trim() : '';

      if (endpoint || apikey) {
        // User has entered custom credentials — validate
        if (!endpoint || !apikey) {
          settingsPanel.style.display = 'block';
          statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.credentials', 'Please configure endpoint and API key.') + '</span>';
          return;
        }
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
        localStorage.setItem(STORAGE_KEY_APIKEY, apikey);
        localStorage.setItem(STORAGE_KEY_MODE, mode);
        if (model) localStorage.setItem(STORAGE_KEY_MODEL, model);

        requestBody.endpoint = endpoint;
        requestBody.apikey = apikey;
        requestBody.mode = mode;
        if (mode === 'openai' && model) requestBody.model = model;
      } else if (!hasCredentials) {
        // No client credentials and no server credentials
        settingsPanel.style.display = 'block';
        statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.credentials', 'Please configure endpoint and API key.') + '</span>';
        return;
      }
      // else: no client credentials but server has them — let server handle it
    } else {
      // Non-devMode: server handles credentials, just check they exist
      if (!hasCredentials) {
        statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.notConfigured', 'API not configured. Please contact your administrator.') + '</span>';
        return;
      }
    }

    // Add user message to conversation
    conversationMessages.push({ role: 'user', content: prompt });
    requestBody.messages = conversationMessages;

    // Clear input
    promptInput.value = '';
    autoResize();

    // Show loading
    isGenerating = true;
    generateBtn.disabled = true;
    generateBtn.style.opacity = '.5';
    emptyState.style.display = 'none';
    loadingEl.style.display = 'block';
    statusDiv.innerHTML = '';
    outputArea.scrollTop = outputArea.scrollHeight;

    try {
      const ajaxUrl = TYPO3.settings.ajaxUrls.ok_ai_writer_generate;
      const response = await fetch(ajaxUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const content = data.choices?.[0]?.message?.content || '';
      generatedHtml = content.trim();

      // Track token usage
      if (data.usage) {
        totalInputTokens += data.usage.prompt_tokens || 0;
        totalOutputTokens += data.usage.completion_tokens || 0;
        tokensInEl.textContent = totalInputTokens.toLocaleString();
        tokensOutEl.textContent = totalOutputTokens.toLocaleString();
        tokenStats.style.display = 'block';
      }

      // Add assistant response to conversation
      conversationMessages.push({ role: 'assistant', content: generatedHtml });

      // Display generated text
      generatedContent.innerHTML = generatedHtml;
      generatedContent.style.display = 'block';
      insertBar.style.display = 'block';

      // Update placeholder for follow-up refinement
      promptInput.placeholder = lang('aitext.prompt.placeholderRefine', 'Refine: e.g. "make it shorter", "more formal", "add a call to action"...');
      statusDiv.innerHTML = '<span style="color:#16a34a;">' + lang('aitext.status.ready', 'Ready to insert or keep refining.') + '</span>';
    } catch (err) {
      conversationMessages.pop();
      statusDiv.innerHTML = '<span style="color:#dc2626;">' + err.message.replace(/</g, '&lt;') + '</span>';
    } finally {
      isGenerating = false;
      generateBtn.disabled = false;
      generateBtn.style.opacity = '1';
      loadingEl.style.display = 'none';
      outputArea.scrollTop = outputArea.scrollHeight;
    }
  }

  generateBtn.addEventListener('click', generate);

  // Enter to send, Shift+Enter for new line
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generate();
    }
  });

  // Insert into editor at saved cursor position
  insertBtn.addEventListener('click', () => {
    if (!generatedHtml) return;
    const viewFragment = editor.data.processor.toView(generatedHtml);
    const modelFragment = editor.data.toModel(viewFragment);
    editor.model.change(writer => {
      writer.setSelection(savedSelection);
      editor.model.insertContent(modelFragment);
    });
    close();
  });

  document.body.appendChild(overlay);
  promptInput.focus();
}

class AiText extends Core.Plugin {
  static get pluginName() {
    return 'AiText';
  }

  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add('aiText', (locale) => {
      const button = new UI.ButtonView(locale);

      button.set({
        label: lang('aitext.toolbar.label', 'AI Text'),
        icon: ICON_SVG,
        tooltip: true,
      });

      button.on('execute', () => {
        createOverlay(editor);
      });

      return button;
    });
  }
}

export { AiText };
export default AiText;
