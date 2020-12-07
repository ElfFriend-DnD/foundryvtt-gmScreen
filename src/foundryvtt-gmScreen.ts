// Import TypeScript modules
import { MODULE_ABBREV, MODULE_ID, MySettings, TEMPLATES } from './module/constants';
import { registerSettings } from './module/settings.js';
import { log } from './module/helpers';
import { GmScreenApplication } from './module/classes/GmScreenApplication';

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

  // Assign custom classes and constants here

  // Register custom module settings
  registerSettings();

  // Preload Handlebars templates
  await loadTemplates(Object.values(flattenObject(TEMPLATES)));

  // Register custom sheets (if any)
});

/* ------------------------------------ */
/* Setup module							*/
/* ------------------------------------ */
Hooks.once('setup', function () {
  // Do anything after initialization but before
  // ready
});

/* ------------------------------------ */
/* When ready							*/
/* ------------------------------------ */
Hooks.once('ready', function () {
  // Do anything once the module is ready
  new GmScreenApplication().render(true);

  game.settings.set(MODULE_ID, MySettings.reset, false);
});

// Add any additional hooks if necessary

// Hooks.on('renderJournalDirectory', (app, html, data) => {
//   if (game.user.isGM) {
//     _addGmScreenButton(html);
//   }
// });
