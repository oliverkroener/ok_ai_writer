import * as Core from '@ckeditor/ckeditor5-core';
import * as UI from '@ckeditor/ckeditor5-ui';

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 1a9 9 0 100 18 9 9 0 000-18zM2.07 9H5.1c.07-1.52.3-2.93.67-4.14A8.03 8.03 0 002.07 9zm7.18-7.93C8.42 2.14 7.68 4.2 7.52 6.5h4.96c-.16-2.3-.9-4.36-1.73-5.43a7.6 7.6 0 00-1.5 0zM7.52 9c.08 1.76.5 3.38 1.1 4.62.37.76.76 1.33 1.13 1.7.15.14.22.18.25.2.03-.02.1-.06.25-.2.37-.37.76-.94 1.13-1.7.6-1.24 1.02-2.86 1.1-4.62H7.52zm5.38-2.5c-.16-2.3-.9-4.36-1.73-5.43a7.6 7.6 0 011.03.15c1.64.66 3 1.82 3.87 3.28-.77.87-1.76 1.54-2.87 1.97-.09.02-.2.03-.3.03zm-5.68-5.28c-.83 1.07-1.57 3.13-1.73 5.43h-.07c-1.01-.4-1.92-1-2.7-1.76a8.02 8.02 0 014.5-3.67zM5.1 11H2.07a8.03 8.03 0 003.7 4.14c-.37-1.21-.6-2.62-.67-4.14zm2.42 0c.16 2.3.9 4.36 1.73 5.43a7.6 7.6 0 01-1.03-.15 8.02 8.02 0 01-3.87-3.28c.77-.87 1.76-1.54 2.87-1.97.09-.02.2-.03.3-.03zm7.38 0c-.07 1.52-.3 2.93-.67 4.14A8.03 8.03 0 0017.93 11h-3.03z"/></svg>';

const LANGUAGES = [
  { code: 'de', label: 'Deutsch' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'en-GB', label: 'English (UK)' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
];

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
    tooltipBg: '#e0e0e0',
    tooltipText: '#1e1e2e',
    langBtnBg: '#252538',
    langBtnBorder: '#7a7a90',
    langBtnHoverBg: '#2e1065',
    cancelBtnBg: '#252538',
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
    shadow: 'rgba(0,0,0,.25)',
    accent: '#7c3aed',
    accentBg: '#f3e8ff',
    successBg: '#f0fdf4',
    successBorder: '#bbf7d0',
    successText: '#15803d',
    successIcon: '#16a34a',
    codeBg: '#e5e7eb',
    tooltipBg: '#333',
    tooltipText: '#fff',
    langBtnBg: '#fff',
    langBtnBorder: '#949494',
    langBtnHoverBg: '#f3e8ff',
    cancelBtnBg: '#fff',
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

  const effectiveMode = devMode && savedMode ? savedMode : serverMode;

  // Theme colors
  const t = getTheme();

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:90000;display:flex;align-items:center;justify-content:center;';

  const dialog = document.createElement('div');
  dialog.style.cssText = `background:${t.bg};border-radius:10px;width:360px;max-width:90vw;box-shadow:0 20px 50px ${t.shadow};font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:${t.text};overflow:hidden;`;
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', lang('aitranslate.dialog.title', 'AI Translate'));

  // Build settings panel HTML based on devMode
  let settingsPanelHtml = '';
  if (devMode) {
    settingsPanelHtml = `
      <div data-settings-panel style="display:none;padding:16px 20px;background:${t.panelBg};border-bottom:1px solid ${t.border};">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">
          <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${t.accent};background:${t.accentBg};padding:2px 8px;border-radius:4px;">DEV</span>
          <span style="font-size:12px;color:${t.muted};">${lang('aitext.settings.devmode', 'Developer Mode — credentials can be overridden')}</span>
        </div>
        <div style="display:grid;gap:10px;">
          <div>
            <label for="ai-translate-mode" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.mode', 'API Mode')}</label>
            <select id="ai-translate-mode" data-field="mode" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};">
              <option value="azure" ${effectiveMode === 'azure' ? 'selected' : ''}>Azure OpenAI</option>
              <option value="openai" ${effectiveMode === 'openai' ? 'selected' : ''}>OpenAI (ChatGPT)</option>
            </select>
          </div>
          <div>
            <label for="ai-translate-endpoint" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.endpoint', 'Endpoint URL')}</label>
            <input id="ai-translate-endpoint" data-field="endpoint" type="url" placeholder="${effectiveMode === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://your-resource.openai.azure.com/openai/deployments/...'}" value="${escapeAttr(savedEndpoint)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
            ${apiUrlBlinded ? `<div style="font-size:11px;color:${t.muted};margin-top:2px;">${lang('aitext.settings.serverValue', 'Server')}: ${escapeAttr(apiUrlBlinded)}</div>` : ''}
          </div>
          <div>
            <label for="ai-translate-apikey" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.apikey', 'API Key')}</label>
            <input id="ai-translate-apikey" data-field="apikey" type="password" placeholder="${lang('aitext.settings.apikeyPlaceholder', 'Your API key')}" value="${escapeAttr(savedApiKey)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
            ${apiKeyBlinded ? `<div style="font-size:11px;color:${t.muted};margin-top:2px;">${lang('aitext.settings.serverValue', 'Server')}: ${escapeAttr(apiKeyBlinded)}</div>` : ''}
          </div>
          <div data-model-row style="display:${effectiveMode === 'openai' ? 'block' : 'none'};">
            <label for="ai-translate-model" style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:${t.label};text-transform:uppercase;letter-spacing:.5px;">${lang('aitext.settings.model', 'Model')}</label>
            <input id="ai-translate-model" data-field="model" type="text" placeholder="gpt-4o" value="${escapeAttr(savedModel || serverModel)}" style="width:100%;padding:8px 10px;border:1px solid ${t.inputBorder};border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:${t.inputBg};color:${t.text};" />
          </div>
        </div>
      </div>`;
  } else {
    const modeLabel = serverMode === 'openai' ? 'OpenAI (ChatGPT)' : 'Azure OpenAI';
    settingsPanelHtml = `
      <div data-settings-panel style="display:none;padding:14px 20px;background:${t.successBg};border-bottom:1px solid ${t.successBorder};">
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

  const languageButtons = LANGUAGES.map(l =>
    `<button data-lang="${l.code}" style="width:100%;padding:10px 16px;border:1px solid ${t.langBtnBorder};border-radius:8px;background:${t.langBtnBg};color:${t.text};font-size:14px;cursor:pointer;text-align:left;transition:background .15s,border-color .15s,box-shadow .15s;">${l.label}</button>`
  ).join('');

  dialog.innerHTML = `
    <style>
      @keyframes ai-tr-pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
      [data-tooltip]{position:relative;}
      [data-tooltip]::after{content:attr(data-tooltip);position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%) scale(.9);background:${t.tooltipBg};color:${t.tooltipText};font-size:13px;font-weight:500;padding:5px 10px;border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;z-index:1;}
      [data-tooltip]:hover::after{opacity:1;transform:translateX(-50%) scale(1);}
      [data-action="settings"]:hover,[data-action="close"]:hover{background:${t.hoverBg} !important;color:${t.hoverText} !important;box-shadow:0 1px 3px rgba(0,0,0,.12);}
      [data-action="settings"]:focus-visible,[data-action="close"]:focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}
      [data-lang]:hover{background:${t.langBtnHoverBg} !important;border-color:#7c3aed !important;box-shadow:0 1px 4px rgba(124,58,237,.15);}
      [data-lang]:focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}
      [data-action="cancel"]:hover{background:${t.hoverBg} !important;border-color:${t.inputBorder} !important;box-shadow:0 1px 3px rgba(0,0,0,.1);}
      [data-action="cancel"]:focus-visible{outline:2px solid #7c3aed;outline-offset:2px;}
      [data-settings-panel] input:focus,[data-settings-panel] select:focus{border-color:#7c3aed !important;box-shadow:0 0 0 2px rgba(124,58,237,.25);}
    </style>

    <!-- Header -->
    <div style="padding:16px 20px;border-bottom:1px solid ${t.border};display:flex;justify-content:space-between;align-items:center;">
      <div style="display:flex;align-items:center;gap:10px;">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" fill="#7c3aed" aria-hidden="true"><path d="M10 1a9 9 0 100 18 9 9 0 000-18zM2.07 9H5.1c.07-1.52.3-2.93.67-4.14A8.03 8.03 0 002.07 9zm7.18-7.93C8.42 2.14 7.68 4.2 7.52 6.5h4.96c-.16-2.3-.9-4.36-1.73-5.43a7.6 7.6 0 00-1.5 0zM7.52 9c.08 1.76.5 3.38 1.1 4.62.37.76.76 1.33 1.13 1.7.15.14.22.18.25.2.03-.02.1-.06.25-.2.37-.37.76-.94 1.13-1.7.6-1.24 1.02-2.86 1.1-4.62H7.52zm7.38 0c-.07 1.52-.3 2.93-.67 4.14A8.03 8.03 0 0017.93 9h-3.03z"/></svg>
        <h3 style="margin:0;font-size:15px;font-weight:600;">${lang('aitranslate.dialog.title', 'AI Translate')}</h3>
      </div>
      <div style="display:flex;align-items:center;gap:2px;">
        <button data-action="settings" aria-label="${lang('aitext.dialog.settings', 'Settings')}" data-tooltip="${lang('aitext.dialog.settings', 'Settings')}" style="background:none;border:none;font-size:18px;cursor:pointer;color:${t.buttonColor};padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&#9881;</button>
        <button data-action="close" aria-label="${lang('aitranslate.dialog.cancel', 'Cancel')}" data-tooltip="${lang('aitranslate.dialog.cancel', 'Cancel')}" style="background:none;border:none;font-size:22px;cursor:pointer;color:${t.buttonColor};padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&times;</button>
      </div>
    </div>

    ${settingsPanelHtml}

    <div style="padding:16px 20px;">
      <p style="margin:0 0 12px;font-size:13px;color:${t.muted};">${lang('aitranslate.dialog.description', 'Select target language to translate the editor content:')}</p>
      <div data-languages style="display:flex;flex-direction:column;gap:6px;">
        ${languageButtons}
      </div>
    </div>
    <div data-status-bar style="display:none;padding:16px 20px;border-top:1px solid ${t.border};" role="status" aria-live="polite">
      <div style="display:flex;align-items:center;gap:10px;color:${t.muted};">
        <span data-spinner style="display:flex;gap:4px;" aria-hidden="true">
          <span style="width:6px;height:6px;background:#7c3aed;border-radius:50%;animation:ai-tr-pulse .6s ease-in-out infinite;"></span>
          <span style="width:6px;height:6px;background:#7c3aed;border-radius:50%;animation:ai-tr-pulse .6s .15s ease-in-out infinite;"></span>
          <span style="width:6px;height:6px;background:#7c3aed;border-radius:50%;animation:ai-tr-pulse .6s .3s ease-in-out infinite;"></span>
        </span>
        <span data-status-text style="font-size:13px;">${lang('aitranslate.loading', 'Translating...')}</span>
      </div>
    </div>
    <div style="padding:0 20px 12px;">
      <button data-action="cancel" style="width:100%;padding:8px;border:1px solid ${t.inputBorder};border-radius:6px;background:${t.cancelBtnBg};font-size:13px;cursor:pointer;color:${t.label};transition:background .15s,border-color .15s,box-shadow .15s;">${lang('aitranslate.dialog.cancel', 'Cancel')}</button>
    </div>
  `;

  overlay.appendChild(dialog);

  const statusBar = dialog.querySelector('[data-status-bar]');
  const statusText = dialog.querySelector('[data-status-text]');
  const cancelBtn = dialog.querySelector('[data-action="cancel"]');
  const langContainer = dialog.querySelector('[data-languages]');
  const settingsPanel = dialog.querySelector('[data-settings-panel]');
  const settingsBtn = dialog.querySelector('[data-action="settings"]');
  let isTranslating = false;

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

  // Show missing credentials info if not devMode and no server credentials
  if (!devMode && !hasCredentials) {
    settingsPanel.style.display = 'block';
  }

  // Toggle settings panel
  settingsBtn.addEventListener('click', () => {
    const visible = settingsPanel.style.display !== 'none';
    settingsPanel.style.display = visible ? 'none' : 'block';
  });

  // Mode selector toggle (devMode only)
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

  function close() {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
    editor.editing.view.focus();
  }

  function onKey(e) {
    if (e.key === 'Escape' && !isTranslating) close();
  }

  overlay.addEventListener('click', (e) => { if (e.target === overlay && !isTranslating) close(); });
  cancelBtn.addEventListener('click', () => { if (!isTranslating) close(); });
  dialog.querySelector('[data-action="close"]').addEventListener('click', () => { if (!isTranslating) close(); });
  document.addEventListener('keydown', onKey);

  // Build request body with credentials from form fields or server
  function buildRequestBody(baseBody) {
    // Include siteRootPageId for per-site credential resolution
    const siteRootPageId = config.siteRootPageId ?? 0;
    if (siteRootPageId > 0) {
      baseBody.siteRootPageId = siteRootPageId;
    }

    if (devMode) {
      const endpoint = endpointInput ? endpointInput.value.trim() : '';
      const apikey = apikeyInput ? apikeyInput.value.trim() : '';
      const mode = modeSelect ? modeSelect.value : serverMode;
      const model = modelInput ? modelInput.value.trim() : '';

      if (endpoint || apikey) {
        if (!endpoint || !apikey) {
          settingsPanel.style.display = 'block';
          return null; // signal: credentials incomplete
        }
        // Save to localStorage
        localStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
        localStorage.setItem(STORAGE_KEY_APIKEY, apikey);
        localStorage.setItem(STORAGE_KEY_MODE, mode);
        if (model) localStorage.setItem(STORAGE_KEY_MODEL, model);

        baseBody.endpoint = endpoint;
        baseBody.apikey = apikey;
        baseBody.mode = mode;
        if (mode === 'openai' && model) baseBody.model = model;
      } else if (!hasCredentials) {
        settingsPanel.style.display = 'block';
        return null; // signal: no credentials at all
      }
    } else {
      if (!hasCredentials) {
        return null;
      }
    }
    return baseBody;
  }

  // Language button clicks
  langContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-lang]');
    if (!btn || isTranslating) return;

    const targetLabel = btn.textContent.trim();
    const htmlContent = editor.getData();

    if (!htmlContent.trim()) {
      statusBar.style.display = 'block';
      statusText.innerHTML = `<span style="color:#dc2626;">${lang('aitranslate.error.empty', 'Editor is empty — nothing to translate.')}</span>`;
      return;
    }

    // Build request body with credentials
    const requestBody = buildRequestBody({ content: htmlContent, language: targetLabel });
    if (requestBody === null) {
      statusBar.style.display = 'block';
      if (devMode) {
        statusText.innerHTML = `<span style="color:#dc2626;">${lang('aitext.error.credentials', 'Please configure endpoint and API key.')}</span>`;
      } else {
        statusText.innerHTML = `<span style="color:#dc2626;">${lang('aitext.error.notConfigured', 'API not configured. Please contact your administrator.')}</span>`;
      }
      return;
    }

    // Disable all buttons and show loading
    isTranslating = true;
    langContainer.querySelectorAll('button').forEach(b => {
      b.disabled = true;
      b.style.opacity = '.5';
      b.style.cursor = 'default';
    });
    btn.style.background = t.langBtnHoverBg;
    btn.style.borderColor = '#7c3aed';
    btn.style.opacity = '1';
    statusBar.style.display = 'block';
    statusText.innerHTML = `${lang('aitranslate.loading', 'Translating...')} → <strong>${targetLabel}</strong>`;

    try {
      const ajaxUrl = TYPO3.settings.ajaxUrls.ok_ai_writer_translate;
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

      const translated = data.choices?.[0]?.message?.content || '';
      if (!translated.trim()) throw new Error('Empty translation received.');

      // Replace editor content
      editor.setData(translated.trim());
      close();
    } catch (err) {
      isTranslating = false;
      langContainer.querySelectorAll('button').forEach(b => {
        b.disabled = false;
        b.style.opacity = '1';
        b.style.cursor = 'pointer';
      });
      statusText.innerHTML = `<span style="color:#dc2626;">${err.message.replace(/</g, '&lt;')}</span>`;
    }
  });

  document.body.appendChild(overlay);
}

class AiTranslate extends Core.Plugin {
  static get pluginName() {
    return 'AiTranslate';
  }

  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add('aiTranslate', (locale) => {
      const button = new UI.ButtonView(locale);

      button.set({
        label: lang('aitranslate.toolbar.label', 'AI Translate'),
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

export { AiTranslate };
export default AiTranslate;
