import * as Core from '@ckeditor/ckeditor5-core';
import * as UI from '@ckeditor/ckeditor5-ui';

const LOREM_PARAGRAPHS = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum tortor quam, feugiat vitae, ultricies eget, tempor sit amet, ante. Donec eu libero sit amet quam egestas semper. Aenean ultricies mi vitae est. Mauris placerat eleifend leo. Quisque sit amet est et sapien ullamcorper pharetra.',
  'Maecenas sed diam eget risus varius blandit sit amet non magna. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Cras mattis consectetur purus sit amet fermentum. Donec id elit non mi porta gravida at eget metus. Nullam quis risus eget urna mollis ornare vel eu leo. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus.',
];

const ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M3 3h14v2H3V3zm0 4h14v2H3V7zm0 4h10v2H3v-2zm0 4h12v2H3v-2z"/></svg>';

class LoremIpsum extends Core.Plugin {
  static get pluginName() {
    return 'LoremIpsum';
  }

  init() {
    const editor = this.editor;

    editor.ui.componentFactory.add('loremIpsum', (locale) => {
      const button = new UI.ButtonView(locale);

      button.set({
        label: 'Lorem Ipsum',
        icon: ICON_SVG,
        tooltip: true,
      });

      button.on('execute', () => {
        editor.model.change((writer) => {
          const docFrag = writer.createDocumentFragment();
          for (const text of LOREM_PARAGRAPHS) {
            const paragraph = writer.createElement('paragraph');
            writer.insertText(text, paragraph);
            writer.append(paragraph, docFrag);
          }
          editor.model.insertContent(docFrag);
        });
        editor.editing.view.focus();
      });

      return button;
    });
  }
}

export { LoremIpsum };
export default LoremIpsum;
