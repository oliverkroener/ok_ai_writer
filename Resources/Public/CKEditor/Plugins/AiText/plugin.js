(function () {
  'use strict';

  var ICON = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>');

  var STORAGE_KEY_ENDPOINT = 'typo3_ai_text_endpoint';
  var STORAGE_KEY_APIKEY = 'typo3_ai_text_apikey';
  var STORAGE_KEY_MODE = 'typo3_ai_text_mode';
  var STORAGE_KEY_MODEL = 'typo3_ai_text_model';

  function escapeAttr(str) {
    return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function lang(key, fallback) {
    return (window.TYPO3 && window.TYPO3.lang && window.TYPO3.lang[key]) || fallback;
  }

  function getConfig() {
    return (window.TYPO3 && window.TYPO3.settings && window.TYPO3.settings.ok_ai_writer) || {};
  }

  function createOverlay(editor) {
    var config = getConfig();
    var devMode = config.devMode || false;
    var serverMode = config.mode || 'azure';
    var serverModel = config.model || 'gpt-4o';
    var hasCredentials = config.hasCredentials || false;
    var apiUrlBlinded = config.apiUrlBlinded || '';
    var apiKeyBlinded = config.apiKeyBlinded || '';

    var savedEndpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT) || '';
    var savedApiKey = localStorage.getItem(STORAGE_KEY_APIKEY) || '';
    var savedMode = localStorage.getItem(STORAGE_KEY_MODE) || '';
    var savedModel = localStorage.getItem(STORAGE_KEY_MODEL) || '';

    var effectiveMode = devMode && savedMode ? savedMode : serverMode;

    // Save cursor position before dialog steals focus
    var bookmarks = editor.getSelection() ? editor.getSelection().createBookmarks2() : null;

    var conversationMessages = [];
    var generatedHtml = '';
    var isGenerating = false;
    var totalInputTokens = 0;
    var totalOutputTokens = 0;

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.5);z-index:90000;display:flex;align-items:center;justify-content:center;';

    var dialog = document.createElement('div');
    dialog.style.cssText = 'background:#fff;border-radius:12px;width:680px;max-width:90vw;height:70vh;max-height:85vh;box-shadow:0 25px 60px rgba(0,0,0,.3);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#333;display:flex;flex-direction:column;overflow:hidden;';

    // Build settings panel HTML based on devMode
    var settingsPanelHtml = '';
    if (devMode) {
      settingsPanelHtml = ''
        + '<div data-settings-panel style="display:none;padding:16px 20px;background:#fafafa;border-bottom:1px solid #e5e5e5;flex-shrink:0;">'
        + '  <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;">'
        + '    <span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#7c3aed;background:#f3e8ff;padding:2px 8px;border-radius:4px;">DEV</span>'
        + '    <span style="font-size:12px;color:#888;">' + lang('aitext.settings.devmode', 'Developer Mode \u2014 credentials can be overridden') + '</span>'
        + '  </div>'
        + '  <div style="display:grid;gap:10px;">'
        + '    <div>'
        + '      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:#555;text-transform:uppercase;letter-spacing:.5px;">' + lang('aitext.settings.mode', 'API Mode') + '</label>'
        + '      <select data-field="mode" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;background:#fff;">'
        + '        <option value="azure"' + (effectiveMode === 'azure' ? ' selected' : '') + '>Azure OpenAI</option>'
        + '        <option value="openai"' + (effectiveMode === 'openai' ? ' selected' : '') + '>OpenAI (ChatGPT)</option>'
        + '      </select>'
        + '    </div>'
        + '    <div>'
        + '      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:#555;text-transform:uppercase;letter-spacing:.5px;">' + lang('aitext.settings.endpoint', 'Endpoint URL') + '</label>'
        + '      <input data-field="endpoint" type="url" placeholder="' + (effectiveMode === 'openai' ? 'https://api.openai.com/v1/chat/completions' : 'https://your-resource.openai.azure.com/openai/deployments/...') + '" value="' + escapeAttr(savedEndpoint) + '" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;" />'
        + (apiUrlBlinded ? '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + lang('aitext.settings.serverValue', 'Server') + ': ' + escapeAttr(apiUrlBlinded) + '</div>' : '')
        + '    </div>'
        + '    <div>'
        + '      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:#555;text-transform:uppercase;letter-spacing:.5px;">' + lang('aitext.settings.apikey', 'API Key') + '</label>'
        + '      <input data-field="apikey" type="password" placeholder="' + lang('aitext.settings.apikeyPlaceholder', 'Your API key') + '" value="' + escapeAttr(savedApiKey) + '" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;" />'
        + (apiKeyBlinded ? '<div style="font-size:11px;color:#aaa;margin-top:2px;">' + lang('aitext.settings.serverValue', 'Server') + ': ' + escapeAttr(apiKeyBlinded) + '</div>' : '')
        + '    </div>'
        + '    <div data-model-row style="display:' + (effectiveMode === 'openai' ? 'block' : 'none') + ';">'
        + '      <label style="display:block;font-size:12px;font-weight:600;margin-bottom:3px;color:#555;text-transform:uppercase;letter-spacing:.5px;">' + lang('aitext.settings.model', 'Model') + '</label>'
        + '      <input data-field="model" type="text" placeholder="gpt-4o" value="' + escapeAttr(savedModel || serverModel) + '" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;box-sizing:border-box;outline:none;" />'
        + '    </div>'
        + '  </div>'
        + '</div>';
    } else {
      var modeLabel = serverMode === 'openai' ? 'OpenAI (ChatGPT)' : 'Azure OpenAI';
      settingsPanelHtml = ''
        + '<div data-settings-panel style="display:none;padding:14px 20px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;flex-shrink:0;">'
        + '  <div style="display:flex;align-items:flex-start;gap:10px;">'
        + '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" fill="#16a34a" style="flex-shrink:0;margin-top:1px;"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>'
        + '    <div style="flex:1;">'
        + '      <div style="font-size:13px;font-weight:600;color:#15803d;margin-bottom:6px;">' + lang('aitext.settings.configured', 'API credentials configured by administrator.') + '</div>'
        + '      <div style="display:grid;gap:4px;font-size:12px;color:#555;">'
        + '        <div><span style="font-weight:600;">' + lang('aitext.settings.mode', 'API Mode') + ':</span> ' + modeLabel + '</div>'
        + (apiUrlBlinded ? '<div><span style="font-weight:600;">' + lang('aitext.settings.endpoint', 'Endpoint URL') + ':</span> <code style="font-size:11px;background:#e5e7eb;padding:1px 4px;border-radius:3px;">' + escapeAttr(apiUrlBlinded) + '</code></div>' : '')
        + (apiKeyBlinded ? '<div><span style="font-weight:600;">' + lang('aitext.settings.apikey', 'API Key') + ':</span> <code style="font-size:11px;background:#e5e7eb;padding:1px 4px;border-radius:3px;">' + escapeAttr(apiKeyBlinded) + '</code></div>' : '')
        + (serverMode === 'openai' ? '<div><span style="font-weight:600;">' + lang('aitext.settings.model', 'Model') + ':</span> ' + escapeAttr(serverModel) + '</div>' : '')
        + '      </div>'
        + '    </div>'
        + '  </div>'
        + '</div>';
    }

    dialog.innerHTML = ''
      + '<style>'
      + '  @keyframes ai-dot-pulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}'
      + '  [data-tooltip]{position:relative;}'
      + '  [data-tooltip]::after{content:attr(data-tooltip);position:absolute;top:calc(100% + 12px);left:50%;transform:translateX(-50%) scale(.9);background:#333;color:#fff;font-size:13px;font-weight:500;padding:5px 10px;border-radius:4px;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .15s,transform .15s;z-index:1;}'
      + '  [data-tooltip]:hover::after{opacity:1;transform:translateX(-50%) scale(1);}'
      + '  [data-action="settings"]:hover,[data-action="maximize"]:hover,[data-action="close"]:hover{background:#f0f0f0 !important;color:#555 !important;box-shadow:0 1px 3px rgba(0,0,0,.12);}'
      + '  [data-action="insert"]:hover{background:#6d28d9 !important;box-shadow:0 2px 8px rgba(124,58,237,.35);}'
      + '  [data-action="generate"]:hover{background:#6d28d9 !important;box-shadow:0 2px 8px rgba(124,58,237,.35);}'
      + '</style>'

      // Header
      + '<div style="display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-bottom:1px solid #e5e5e5;flex-shrink:0;">'
      + '  <div style="display:flex;align-items:center;gap:10px;">'
      + '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20" fill="#7c3aed"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>'
      + '    <h2 style="margin:0;font-size:16px;font-weight:600;">' + lang('aitext.dialog.title', 'AI Text Generator') + '</h2>'
      + '  </div>'
      + '  <div style="display:flex;align-items:center;gap:2px;">'
      + '    <button data-action="settings" data-tooltip="' + lang('aitext.dialog.settings', 'Settings') + '" style="background:none;border:none;font-size:18px;cursor:pointer;color:#888;padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&#9881;</button>'
      + '    <button data-action="maximize" data-tooltip="' + lang('aitext.dialog.maximize', 'Maximize') + '" style="background:none;border:none;font-size:16px;cursor:pointer;color:#888;padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&#9744;</button>'
      + '    <button data-action="close" data-tooltip="' + lang('aitext.dialog.close', 'Close') + '" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888;padding:4px 8px;border-radius:6px;line-height:1;transition:background .15s,color .15s,box-shadow .15s;">&times;</button>'
      + '  </div>'
      + '</div>'

      + settingsPanelHtml

      // Output area
      + '<div data-output-area style="flex:1;overflow-y:auto;padding:24px 20px;">'
      + '  <div data-empty-state style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:200px;color:#aaa;padding:40px 20px;">'
      + '    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="40" height="40" fill="#ddd" style="margin-bottom:16px;"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>'
      + '    <p style="font-size:15px;font-weight:500;margin:0 0 6px;color:#999;">' + lang('aitext.empty.title', 'What would you like to write?') + '</p>'
      + '    <p style="font-size:13px;margin:0;color:#bbb;">' + lang('aitext.empty.description', 'Describe your text below and the AI will generate it for you.') + '</p>'
      + '  </div>'
      + '  <div data-generated-content style="display:none;font-size:14px;line-height:1.7;"></div>'
      + '  <div data-loading style="display:none;padding:16px 0;">'
      + '    <div style="display:flex;align-items:center;gap:10px;color:#999;">'
      + '      <span style="display:flex;gap:4px;">'
      + '        <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s ease-in-out infinite;"></span>'
      + '        <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s .15s ease-in-out infinite;"></span>'
      + '        <span style="width:8px;height:8px;background:#7c3aed;border-radius:50%;animation:ai-dot-pulse .6s .3s ease-in-out infinite;"></span>'
      + '      </span>'
      + '      <span style="font-size:13px;">' + lang('aitext.loading', 'Generating...') + '</span>'
      + '    </div>'
      + '  </div>'
      + '</div>'

      // Insert bar
      + '<div data-insert-bar style="display:none;padding:0 20px 4px;flex-shrink:0;">'
      + '  <button data-action="insert" style="width:100%;padding:10px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;transition:background .15s,box-shadow .15s;">' + lang('aitext.insert', 'Insert into Editor') + '</button>'
      + '</div>'

      // Input area
      + '<div style="padding:12px 20px 16px;border-top:1px solid #e5e5e5;flex-shrink:0;">'
      + '  <div data-input-container style="display:flex;align-items:flex-end;gap:8px;border:1.5px solid #ddd;border-radius:12px;padding:8px 8px 8px 16px;background:#fafafa;transition:border-color .15s;">'
      + '    <textarea data-field="prompt" rows="1" placeholder="' + lang('aitext.prompt.placeholder', 'Describe the text you want to generate...') + '" style="flex:1;border:none;background:transparent;resize:none;font-size:14px;line-height:1.5;font-family:inherit;outline:none;max-height:120px;padding:4px 0;overflow-y:auto;"></textarea>'
      + '    <button data-action="generate" title="' + lang('aitext.send', 'Send (Enter)') + '" style="flex-shrink:0;width:36px;height:36px;border:none;border-radius:8px;background:#7c3aed;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s,background .15s,box-shadow .15s;">'
      + '      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>'
      + '    </button>'
      + '  </div>'
      + '  <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 4px 0;min-height:16px;">'
      + '    <div data-status style="font-size:12px;"></div>'
      + '    <div data-token-stats style="font-size:11px;color:#aaa;display:none;">'
      + '      <span data-tokens-in title="Input tokens">0</span> ' + lang('aitext.tokens.in', 'in') + ' / <span data-tokens-out title="Output tokens">0</span> ' + lang('aitext.tokens.out', 'out')
      + '    </div>'
      + '  </div>'
      + '</div>';

    overlay.appendChild(dialog);

    // --- Element references ---
    var promptInput = dialog.querySelector('[data-field="prompt"]');
    var outputArea = dialog.querySelector('[data-output-area]');
    var emptyState = dialog.querySelector('[data-empty-state]');
    var generatedContent = dialog.querySelector('[data-generated-content]');
    var loadingEl = dialog.querySelector('[data-loading]');
    var statusDiv = dialog.querySelector('[data-status]');
    var generateBtn = dialog.querySelector('[data-action="generate"]');
    var insertBar = dialog.querySelector('[data-insert-bar]');
    var insertBtn = dialog.querySelector('[data-action="insert"]');
    var settingsPanel = dialog.querySelector('[data-settings-panel]');
    var settingsBtn = dialog.querySelector('[data-action="settings"]');
    var inputContainer = dialog.querySelector('[data-input-container]');
    var tokenStats = dialog.querySelector('[data-token-stats]');
    var tokensInEl = dialog.querySelector('[data-tokens-in]');
    var tokensOutEl = dialog.querySelector('[data-tokens-out]');
    var maximizeBtn = dialog.querySelector('[data-action="maximize"]');

    // Dev mode specific elements
    var endpointInput = dialog.querySelector('[data-field="endpoint"]');
    var apikeyInput = dialog.querySelector('[data-field="apikey"]');
    var modeSelect = dialog.querySelector('[data-field="mode"]');
    var modelInput = dialog.querySelector('[data-field="model"]');
    var modelRow = dialog.querySelector('[data-model-row]');

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
      modeSelect.addEventListener('change', function () {
        var isOpenAI = modeSelect.value === 'openai';
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
      editor.focus();
    }

    function onEsc(e) {
      if (e.key === 'Escape') close();
    }

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    dialog.querySelector('[data-action="close"]').addEventListener('click', close);
    document.addEventListener('keydown', onEsc);

    // Toggle settings panel
    settingsBtn.addEventListener('click', function () {
      var visible = settingsPanel.style.display !== 'none';
      settingsPanel.style.display = visible ? 'none' : 'block';
    });

    // Toggle maximize/restore
    var isMaximized = false;
    maximizeBtn.addEventListener('click', function () {
      isMaximized = !isMaximized;
      if (isMaximized) {
        dialog.style.width = '100vw';
        dialog.style.height = '100vh';
        dialog.style.maxWidth = '100vw';
        dialog.style.maxHeight = '100vh';
        dialog.style.borderRadius = '0';
        maximizeBtn.innerHTML = '&#9723;';
        maximizeBtn.setAttribute('data-tooltip', lang('aitext.dialog.restore', 'Restore'));
      } else {
        dialog.style.width = '680px';
        dialog.style.height = '70vh';
        dialog.style.maxWidth = '90vw';
        dialog.style.maxHeight = '85vh';
        dialog.style.borderRadius = '12px';
        maximizeBtn.innerHTML = '&#9744;';
        maximizeBtn.setAttribute('data-tooltip', lang('aitext.dialog.maximize', 'Maximize'));
      }
    });

    // Auto-resize textarea
    function autoResize() {
      promptInput.style.height = 'auto';
      promptInput.style.height = Math.min(promptInput.scrollHeight, 120) + 'px';
    }
    promptInput.addEventListener('input', autoResize);

    // Input focus styling
    promptInput.addEventListener('focus', function () { inputContainer.style.borderColor = '#7c3aed'; });
    promptInput.addEventListener('blur', function () { inputContainer.style.borderColor = '#ddd'; });

    // --- Generate ---
    function generate() {
      if (isGenerating) return;

      var prompt = promptInput.value.trim();
      if (!prompt) return;

      // Build request body
      var requestBody = {};

      if (devMode) {
        var endpoint = endpointInput ? endpointInput.value.trim() : '';
        var apikey = apikeyInput ? apikeyInput.value.trim() : '';
        var mode = modeSelect ? modeSelect.value : serverMode;
        var model = modelInput ? modelInput.value.trim() : '';

        if (endpoint || apikey) {
          if (!endpoint || !apikey) {
            settingsPanel.style.display = 'block';
            statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.credentials', 'Please configure endpoint and API key.') + '</span>';
            return;
          }
          localStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
          localStorage.setItem(STORAGE_KEY_APIKEY, apikey);
          localStorage.setItem(STORAGE_KEY_MODE, mode);
          if (model) localStorage.setItem(STORAGE_KEY_MODEL, model);

          requestBody.endpoint = endpoint;
          requestBody.apikey = apikey;
          requestBody.mode = mode;
          if (mode === 'openai' && model) requestBody.model = model;
        } else if (!hasCredentials) {
          settingsPanel.style.display = 'block';
          statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.credentials', 'Please configure endpoint and API key.') + '</span>';
          return;
        }
      } else {
        if (!hasCredentials) {
          statusDiv.innerHTML = '<span style="color:#dc2626;">' + lang('aitext.error.notConfigured', 'API not configured. Please contact your administrator.') + '</span>';
          return;
        }
      }

      conversationMessages.push({ role: 'user', content: prompt });
      requestBody.messages = conversationMessages;

      promptInput.value = '';
      autoResize();

      isGenerating = true;
      generateBtn.disabled = true;
      generateBtn.style.opacity = '.5';
      emptyState.style.display = 'none';
      loadingEl.style.display = 'block';
      statusDiv.innerHTML = '';
      outputArea.scrollTop = outputArea.scrollHeight;

      var ajaxUrl = TYPO3.settings.ajaxUrls.ok_ai_writer_generate;
      var xhr = new XMLHttpRequest();
      xhr.open('POST', ajaxUrl, true);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onload = function () {
        var data;
        try {
          data = JSON.parse(xhr.responseText);
        } catch (e) {
          data = {};
        }

        if (xhr.status >= 400 || data.error) {
          conversationMessages.pop();
          statusDiv.innerHTML = '<span style="color:#dc2626;">' + (data.error || 'Server error ' + xhr.status).replace(/</g, '&lt;') + '</span>';
        } else {
          var content = (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
          generatedHtml = content.trim().replace(/^```[\w]*\n?/, '').replace(/\n?```$/, '').trim();

          if (data.usage) {
            totalInputTokens += data.usage.prompt_tokens || 0;
            totalOutputTokens += data.usage.completion_tokens || 0;
            tokensInEl.textContent = totalInputTokens.toLocaleString();
            tokensOutEl.textContent = totalOutputTokens.toLocaleString();
            tokenStats.style.display = 'block';
          }

          conversationMessages.push({ role: 'assistant', content: generatedHtml });

          generatedContent.innerHTML = generatedHtml;
          generatedContent.style.display = 'block';
          insertBar.style.display = 'block';

          promptInput.placeholder = lang('aitext.prompt.placeholderRefine', 'Refine: e.g. "make it shorter", "more formal", "add a call to action"...');
          statusDiv.innerHTML = '<span style="color:#16a34a;">' + lang('aitext.status.ready', 'Ready to insert or keep refining.') + '</span>';
        }

        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';
        loadingEl.style.display = 'none';
        outputArea.scrollTop = outputArea.scrollHeight;
      };

      xhr.onerror = function () {
        conversationMessages.pop();
        statusDiv.innerHTML = '<span style="color:#dc2626;">Network error</span>';
        isGenerating = false;
        generateBtn.disabled = false;
        generateBtn.style.opacity = '1';
        loadingEl.style.display = 'none';
      };

      xhr.send(JSON.stringify(requestBody));
    }

    generateBtn.addEventListener('click', generate);

    promptInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generate();
      }
    });

    // Insert into editor at saved cursor position
    insertBtn.addEventListener('click', function () {
      if (!generatedHtml) return;
      if (bookmarks) {
        editor.getSelection().selectBookmarks(bookmarks);
      }
      editor.insertHtml(generatedHtml);
      close();
    });

    document.body.appendChild(overlay);
    promptInput.focus();
  }

  CKEDITOR.plugins.add('ai_text', {
    icons: 'aitext',
    init: function (editor) {
      var pluginPath = this.path;
      editor.addCommand('aiText', {
        exec: function (ed) {
          createOverlay(ed);
        }
      });

      editor.ui.addButton('AiText', {
        label: lang('aitext.toolbar.label', 'AI Text'),
        command: 'aiText',
        toolbar: 'ai',
        icon: pluginPath + 'icons/aitext.svg'
      });
    }
  });
})();
