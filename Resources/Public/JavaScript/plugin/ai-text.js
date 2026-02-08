import * as Core from '@ckeditor/ckeditor5-core';
import * as UI from '@ckeditor/ckeditor5-ui';

// Sparkle/AI icon (similar to Copilot/Gemini sparkle icons)
const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M8 1l1.5 3.5L13 6l-3.5 1.5L8 11 6.5 7.5 3 6l3.5-1.5L8 1zm6 7l1 2.5L17.5 12 15 13l-1 2.5L13 13l-2.5-1L13 10.5 14 8zM5.5 12l.75 1.75L8 14.5l-1.75.75L5.5 17l-.75-1.75L3 14.5l1.75-.75L5.5 12z"/></svg>';

const STORAGE_KEY_ENDPOINT = 'typo3_ai_text_endpoint';
const STORAGE_KEY_APIKEY = 'typo3_ai_text_apikey';

function createOverlay(editor) {
  const savedEndpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT) || '';
  const savedApiKey = localStorage.getItem(STORAGE_KEY_APIKEY) || '';

  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:90000;display:flex;align-items:center;justify-content:center;';

  const dialog = document.createElement('div');
  dialog.style.cssText = 'background:#fff;border-radius:8px;padding:24px;width:640px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);font-family:sans-serif;color:#333;';

  dialog.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h2 style="margin:0;font-size:18px;">AI Text Generator</h2>
      <button data-action="close" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;padding:0 4px;">&times;</button>
    </div>

    <details data-settings style="margin-bottom:16px;border:1px solid #ddd;border-radius:6px;padding:4px 12px;">
      <summary style="cursor:pointer;padding:8px 0;font-weight:600;font-size:13px;color:#555;">Azure AI Settings</summary>
      <div style="padding:8px 0 12px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Endpoint URL</label>
        <input data-field="endpoint" type="url" placeholder="https://your-resource.openai.azure.com/openai/deployments/your-deployment/chat/completions?api-version=2024-02-01" value="${savedEndpoint.replace(/"/g, '&quot;')}" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;margin-bottom:10px;" />
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">API Key</label>
        <input data-field="apikey" type="password" placeholder="Your Azure AI API key" value="${savedApiKey.replace(/"/g, '&quot;')}" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:4px;font-size:13px;box-sizing:border-box;" />
      </div>
    </details>

    <div style="margin-bottom:16px;">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Prompt</label>
      <textarea data-field="prompt" rows="4" placeholder="Describe the text you want to generate..." style="width:100%;padding:10px;border:1px solid #ccc;border-radius:4px;font-size:14px;resize:vertical;box-sizing:border-box;font-family:sans-serif;"></textarea>
    </div>

    <div style="margin-bottom:16px;">
      <button data-action="generate" style="padding:8px 20px;background:#0078d4;color:#fff;border:none;border-radius:4px;font-size:14px;font-weight:600;cursor:pointer;">Generate</button>
      <span data-status style="margin-left:12px;font-size:13px;color:#666;"></span>
    </div>

    <div data-output-wrapper style="display:none;margin-bottom:16px;">
      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Generated Text</label>
      <div data-field="output" contenteditable="false" style="width:100%;min-height:120px;max-height:300px;overflow-y:auto;padding:12px;border:1px solid #ccc;border-radius:4px;font-size:14px;line-height:1.6;background:#f9f9f9;box-sizing:border-box;white-space:pre-wrap;"></div>
    </div>

    <div style="display:flex;justify-content:flex-end;gap:8px;border-top:1px solid #eee;padding-top:16px;">
      <button data-action="cancel" style="padding:8px 20px;background:#f0f0f0;color:#333;border:1px solid #ccc;border-radius:4px;font-size:14px;cursor:pointer;">Cancel</button>
      <button data-action="insert" disabled style="padding:8px 20px;background:#107c10;color:#fff;border:none;border-radius:4px;font-size:14px;font-weight:600;cursor:pointer;opacity:.5;">Insert into Editor</button>
    </div>
  `;

  overlay.appendChild(dialog);

  const endpointInput = dialog.querySelector('[data-field="endpoint"]');
  const apikeyInput = dialog.querySelector('[data-field="apikey"]');
  const promptInput = dialog.querySelector('[data-field="prompt"]');
  const outputWrapper = dialog.querySelector('[data-output-wrapper]');
  const outputDiv = dialog.querySelector('[data-field="output"]');
  const statusSpan = dialog.querySelector('[data-status]');
  const generateBtn = dialog.querySelector('[data-action="generate"]');
  const insertBtn = dialog.querySelector('[data-action="insert"]');
  const settingsEl = dialog.querySelector('[data-settings]');

  // Auto-open settings if not configured
  if (!savedEndpoint || !savedApiKey) {
    settingsEl.open = true;
  }

  let generatedHtml = '';

  function close() {
    overlay.remove();
    editor.editing.view.focus();
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  dialog.querySelector('[data-action="close"]').addEventListener('click', close);
  dialog.querySelector('[data-action="cancel"]').addEventListener('click', close);

  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onEsc);
    }
  });

  generateBtn.addEventListener('click', async () => {
    const endpoint = endpointInput.value.trim();
    const apikey = apikeyInput.value.trim();
    const prompt = promptInput.value.trim();

    if (!endpoint || !apikey) {
      settingsEl.open = true;
      statusSpan.textContent = 'Please configure endpoint and API key.';
      statusSpan.style.color = '#d32f2f';
      return;
    }
    if (!prompt) {
      statusSpan.textContent = 'Please enter a prompt.';
      statusSpan.style.color = '#d32f2f';
      return;
    }

    // Persist settings
    localStorage.setItem(STORAGE_KEY_ENDPOINT, endpoint);
    localStorage.setItem(STORAGE_KEY_APIKEY, apikey);

    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    statusSpan.textContent = '';
    outputWrapper.style.display = 'none';
    insertBtn.disabled = true;
    insertBtn.style.opacity = '.5';

    try {
      // Proxy through TYPO3 backend to avoid CORS issues
      const ajaxUrl = TYPO3.settings.ajaxUrls.ok_ai_writer_generate;
      const response = await fetch(ajaxUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: endpoint,
          apikey: apikey,
          prompt: prompt,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const content = data.choices?.[0]?.message?.content || '';

      generatedHtml = content.trim();
      outputDiv.innerHTML = generatedHtml;
      outputWrapper.style.display = 'block';
      insertBtn.disabled = false;
      insertBtn.style.opacity = '1';
      statusSpan.textContent = 'Text generated successfully.';
      statusSpan.style.color = '#107c10';
    } catch (err) {
      statusSpan.textContent = err.message;
      statusSpan.style.color = '#d32f2f';
    } finally {
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate';
    }
  });

  insertBtn.addEventListener('click', () => {
    if (!generatedHtml) return;

    const viewFragment = editor.data.processor.toView(generatedHtml);
    const modelFragment = editor.data.toModel(viewFragment);
    editor.model.insertContent(modelFragment);
    close();
  });

  // Ctrl+Enter in prompt triggers generate
  promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      generateBtn.click();
    }
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
        label: 'AI Text',
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
