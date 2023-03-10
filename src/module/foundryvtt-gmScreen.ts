import { GmScreen } from './classes/GmScreen';
import { MODULE_ABBREV, MODULE_ID } from './constants';
import { log } from './helpers';

// Initialize module
Hooks.once('init', async () => {
  console.log('gm-screen | Initializing GM Screen');

  GmScreen.init();
});

// When ready
Hooks.once('ready', async () => {
  GmScreen.ready();
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});

/* Entity Sheet Override */

Hooks.on('renderDocumentSheetConfig', async (app: any, html: any, data: any) => {
  if (!game.user?.isGM) {
    return;
  }

  const htmlToInject = await renderTemplate(GmScreen.TEMPLATES['entitySheetInjection'], {
    ...data,
    gmScreenSheetClass: app.object.getFlag(MODULE_ID, 'gmScreenSheetClass'),
  });

  log(false, 'rendering entity sheet config', {
    htmlToInject,
    target: html.find('[name=submit]'),
    current: app.object.getFlag(MODULE_ID, 'gmScreenSheetClass'),
  });

  html.find('[name=submit]').before(htmlToInject);

  html.on('change', 'select[name=gmScreenSheetClass]', (event: any) => {
    log(false, 'custom change listener firing', {
      event,
      value: event.target.value,
    });
    app.object.setFlag(MODULE_ID, 'gmScreenSheetClass', event.target.value);
  });

  app.setPosition({ height: 'auto' });
});

/**
 * Hacky way to ensure our drawer stays in the right place as the sidebar collapses and uncollapses
 */
Hooks.on('collapseSidebar', () => {
  const uiRight = document.querySelector('#ui-right');
  if (!uiRight) {
    return;
  }

  const uiRightStyles = getComputedStyle(uiRight);

  document.querySelector('body')?.style.setProperty('--gm-screen-ui-right-width', uiRightStyles.width);
});

/***************************/
// HANDLEBARS HELPERS

Handlebars.registerHelper(`${MODULE_ABBREV}-path`, (relativePath: string) => {
  return `modules/${MODULE_ID}/${relativePath}`;
});

/*
 * https://stackoverflow.com/questions/53398408/switch-case-with-default-in-handlebars-js
 * {{#switch 'a'}}
 *   {{#case 'a'}} A {{/case}}
 *   {{#case 'b'}} B {{/case}}
 * {{/switch}}
 */
Handlebars.registerHelper(`${MODULE_ABBREV}-switch`, function (value, options) {
  //@ts-expect-error handlebars things
  this.switch_value = value;
  //@ts-expect-error handlebars things
  return options.fn(this);
});

Handlebars.registerHelper(`${MODULE_ABBREV}-case`, function (value, options) {
  //@ts-expect-error handlebars things
  if (value == this.switch_value) {
    //@ts-expect-error handlebars things
    return options.fn(this);
  }
});

Handlebars.registerHelper(`${MODULE_ABBREV}-enrich`, function (str) {
  return TextEditor.enrichHTML(str);
});
