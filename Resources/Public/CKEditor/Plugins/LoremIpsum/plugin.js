(function () {
  'use strict';

  var ICON = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5 2C4.4 2 4 2.4 4 3v14c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V6l-4-4H5zm6 1l3 3h-3V3zM6.5 9h7c.3 0 .5.2.5.5s-.2.5-.5.5h-7C6.2 10 6 9.8 6 9.5S6.2 9 6.5 9zm0 2.5h5c.3 0 .5.2.5.5s-.2.5-.5.5h-5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5zm0 2.5h6c.3 0 .5.2.5.5s-.2.5-.5.5h-6c-.3 0-.5-.2-.5-.5s.2-.5.5-.5z"/></svg>');

  var LOREM_PARAGRAPHS = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.',
    'Maecenas sed diam eget risus varius blandit sit amet non magna. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cras mattis consectetur purus sit amet fermentum. Donec id elit non mi porta gravida at eget metus. Nullam quis risus eget urna mollis ornare vel eu leo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
    'Etiam porta sem malesuada magna mollis euismod. Vivamus sagittis lacus vel augue laoreet rutrum faucibus dolor auctor. Praesent commodo cursus magna, vel scelerisque nisl consectetur et. Aenean lacinia bibendum nulla sed consectetur. Fusce dapibus, tellus ac cursus commodo, tortor mauris condimentum nibh.',
    'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit.',
    'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga.'
  ];

  function lang(key, fallback) {
    return (window.TYPO3 && window.TYPO3.lang && window.TYPO3.lang[key]) || fallback;
  }

  CKEDITOR.plugins.add('lorem_ipsum', {
    icons: 'loremipsum',
    hidpi: true,

    init: function (editor) {
      editor.addCommand('loremIpsum', {
        exec: function (ed) {
          // Save cursor position before dialog steals focus
          var bookmarks = ed.getSelection() ? ed.getSelection().createBookmarks2() : null;

          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;background:rgba(0,0,0,.5);z-index:90000;display:flex;align-items:center;justify-content:center;';

          var dialog = document.createElement('div');
          dialog.style.cssText = 'background:#fff;border-radius:10px;width:320px;max-width:90vw;box-shadow:0 20px 50px rgba(0,0,0,.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#333;overflow:hidden;';

          dialog.innerHTML = ''
            + '<style>'
            + '  [data-action="cancel"]:hover{background:#f5f5f5 !important;border-color:#ccc !important;box-shadow:0 1px 3px rgba(0,0,0,.1);}'
            + '  [data-action="ok"]:hover{background:#6d28d9 !important;box-shadow:0 2px 8px rgba(124,58,237,.35);}'
            + '</style>'
            + '<div style="padding:16px 20px;border-bottom:1px solid #e5e5e5;display:flex;align-items:center;gap:10px;">'
            + '  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="18" height="18" fill="#666"><path d="M5 2C4.4 2 4 2.4 4 3v14c0 .6.4 1 1 1h10c.6 0 1-.4 1-1V6l-4-4H5zm6 1l3 3h-3V3zM6.5 9h7c.3 0 .5.2.5.5s-.2.5-.5.5h-7C6.2 10 6 9.8 6 9.5S6.2 9 6.5 9zm0 2.5h5c.3 0 .5.2.5.5s-.2.5-.5.5h-5c-.3 0-.5-.2-.5-.5s.2-.5.5-.5zm0 2.5h6c.3 0 .5.2.5.5s-.2.5-.5.5h-6c-.3 0-.5-.2-.5-.5s.2-.5.5-.5z"/></svg>'
            + '  <h3 style="margin:0;font-size:15px;font-weight:600;">' + lang('loremipsum.dialog.title', 'Lorem Ipsum') + '</h3>'
            + '</div>'
            + '<div style="padding:20px;">'
            + '  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:#555;">' + lang('loremipsum.dialog.count', 'Number of paragraphs') + '</label>'
            + '  <input data-field="count" type="number" min="1" max="20" value="3" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:14px;box-sizing:border-box;outline:none;text-align:center;" />'
            + '</div>'
            + '<div style="display:flex;gap:8px;padding:0 20px 16px;justify-content:flex-end;">'
            + '  <button data-action="cancel" style="padding:8px 16px;border:1px solid #ddd;border-radius:6px;background:#fff;font-size:13px;cursor:pointer;color:#555;transition:background .15s,border-color .15s,box-shadow .15s;">' + lang('loremipsum.dialog.cancel', 'Cancel') + '</button>'
            + '  <button data-action="ok" style="padding:8px 16px;border:none;border-radius:6px;background:#7c3aed;color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:background .15s,box-shadow .15s;">' + lang('loremipsum.dialog.insert', 'Insert') + '</button>'
            + '</div>';

          overlay.appendChild(dialog);

          var countInput = dialog.querySelector('[data-field="count"]');
          var okBtn = dialog.querySelector('[data-action="ok"]');
          var cancelBtn = dialog.querySelector('[data-action="cancel"]');

          function close() {
            overlay.remove();
            document.removeEventListener('keydown', onKey);
            ed.focus();
          }

          function insert() {
            var count = Math.max(1, Math.min(20, parseInt(countInput.value, 10) || 3));
            var html = '';
            for (var i = 0; i < count; i++) {
              html += '<p>' + LOREM_PARAGRAPHS[i % LOREM_PARAGRAPHS.length] + '</p>';
            }
            if (bookmarks) {
              ed.getSelection().selectBookmarks(bookmarks);
            }
            ed.insertHtml(html);
            close();
          }

          function onKey(e) {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter') { e.preventDefault(); insert(); }
          }

          overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
          cancelBtn.addEventListener('click', close);
          okBtn.addEventListener('click', insert);
          document.addEventListener('keydown', onKey);

          document.body.appendChild(overlay);
          countInput.focus();
          countInput.select();
        }
      });

      editor.ui.addButton('LoremIpsum', {
        label: 'Lorem Ipsum',
        command: 'loremIpsum',
        icon: ICON
      });
    }
  });
})();
