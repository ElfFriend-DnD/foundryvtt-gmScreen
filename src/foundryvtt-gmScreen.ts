// Import TypeScript modules
import { MODULE_ABBREV, MODULE_ID, MySettings, TEMPLATES } from './module/constants';
import { registerSettings } from './module/settings.js';
import { log } from './module/helpers';
import { GmScreenApplication } from './module/classes/GmScreenApplication';
import { _gmScreenMigrate } from './module/migration';

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

/* ------------------------------------ */
/* Initialize module					*/
/* ------------------------------------ */
Hooks.once('init', async function () {
  log(true, `Initializing ${MODULE_ID}`);

  // Register custom module settings
  registerSettings();

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
  if (game.user.isGM) {
    if (displayDrawer) {
      const gmScreenInstance = new GmScreenApplication();

      gmScreenInstance.render(true);

      window[MODULE_ID].toggleGmScreenVisibility = gmScreenInstance.toggleGmScreenVisibility;
    }

    game.settings.set(MODULE_ID, MySettings.reset, false);
  }
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

    new GmScreenApplication().render(true);
  });
}

Hooks.on('renderJournalDirectory', (app, html, data) => {
  const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  if (!displayDrawer) {
    _addGmScreenButton(html);
  }
});

Hooks.on('renderGmScreenApplication', (app,html,data) => {
  Hooks.callAll("gmScreen", app, true);
});

Hooks.on('closeGmScreenApplication', (app,html,data) => {
  Hooks.callAll("gmScreen", app, false);
});

Hooks.on('renderGmScreen', (render) => { 
  const displayDrawer = game.settings.get(MODULE_ID, MySettings.displayDrawer);

  if (displayDrawer) {
      const app = document.getElementsByClassName("gm-screen-app gm-screen-drawer expanded")[0];
      
      if ( (app == undefined && render) || (app != undefined && render == false) )
          document.getElementsByClassName("gm-screen-button")[0].click();
  }
  else {
      const app = document.getElementById("gm-screen-app");
      
      if (app == undefined && render) 
          new GmScreenApplication().render(true);
      else if (app != undefined && render == false) {
          app.getElementsByClassName("header-button close")[0].click(); 
      }
  }
});