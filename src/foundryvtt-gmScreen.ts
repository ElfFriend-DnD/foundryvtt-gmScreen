// Import TypeScript modules
import { MODULE_ABBREV, MODULE_ID, MyHooks, MySettings, TEMPLATES } from './module/constants';
import { GmScreenSettings } from './module/classes/GmScreenSettings';
import { log } from './module/helpers';
import { GmScreenApplication } from './module/classes/GmScreenApplication';
import { _gmScreenMigrate } from './module/migration';

let gmScreenInstance: GmScreenApplication;

function toggleGmScreenOpen(isOpen?: boolean) {
  if (!game.user.isGM) {
    return;
  }

  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);
  if (displayDrawer && !!gmScreenInstance) {
    gmScreenInstance.toggleGmScreenVisibility(isOpen);
    return;
  }

  if (!gmScreenInstance) {
    gmScreenInstance = new GmScreenApplication();
  }

  // @ts-ignore
  const shouldOpen = isOpen ?? (gmScreenInstance._state < 1 ? true : false);

  try {
    if (shouldOpen) {
      gmScreenInstance.render(true);
      //@ts-ignore
      if (gmScreenInstance._minimized) {
        gmScreenInstance.maximize();
      }
      //@ts-ignore
      gmScreenInstance.bringToTop();
    } else {
      gmScreenInstance.close();
    }
  } catch (e) {}
}

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
  this.switch_value = value;
  return options.fn(this);
});

Handlebars.registerHelper(`${MODULE_ABBREV}-case`, function (value, options) {
  if (value == this.switch_value) {
    return options.fn(this);
  }
});

Handlebars.registerHelper(`${MODULE_ABBREV}-enrich`, function (str) {
  return TextEditor.enrichHTML(str);
});

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
  log(true, `Initializing ${MODULE_ID}`);

  // Register custom module settings
  GmScreenSettings.init();

  // Preload Handlebars templates
  await loadTemplates(Object.values(flattenObject(TEMPLATES)));
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', async function () {
  await _gmScreenMigrate();

  window[MODULE_ID] = { migration: _gmScreenMigrate };

  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  // Do anything once the module is ready
  if (displayDrawer) {
    gmScreenInstance = new GmScreenApplication();
    if (game.user.isGM || Object.values(gmScreenInstance.data.grids).some(grid => grid.shared)) {
        gmScreenInstance.render(true);
    }
  }

  window[MODULE_ID].toggleGmScreenVisibility = toggleGmScreenOpen;
  window[MODULE_ID].refreshGmScreen = gmScreenInstance?.render.bind(gmScreenInstance);

  if (game.user.isGM) {
    game.settings.set(MODULE_ID, MySettings.reset, false);
  }

  Hooks.callAll(MyHooks.ready);
});

function _addGmScreenButton(html) {
  const actionButtons = html.find('.action-buttons');

  const gmScreenButtonHtml = `<button class="gm-screen-button">
          <i class="fas fa-book-reader"></i> ${game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Open`)}
      </button>`;

  actionButtons.append(gmScreenButtonHtml);

  const gmScreenButton = html.find('button.gm-screen-button');

  gmScreenButton.on('click', (event) => {
    event.preventDefault();
    toggleGmScreenOpen(true);
  });
}

Hooks.on('renderJournalDirectory', (app, html, data) => {
  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  if (game.user.isGM && !displayDrawer) {
    _addGmScreenButton(html);
  }
});

// when gm screen in non-drawer mode is closed call MyHooks.openClose with isOpen: false
Hooks.on('closeGmScreenApplication', (app, html, data) => {
  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  if (!displayDrawer) {
    Hooks.callAll(MyHooks.openClose, app, { isOpen: false });
  }
});

// when gm screen in non-drawer mode is opened call MyHooks.openClose with isOpen: true
Hooks.on('renderGmScreenApplication', (app, html, data) => {
  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  if (!displayDrawer) {
    Hooks.callAll(MyHooks.openClose, app, { isOpen: true });
  }
});

Hooks.once('devModeReady', ({ registerPackageDebugFlag }) => {
  registerPackageDebugFlag(MODULE_ID);
});
