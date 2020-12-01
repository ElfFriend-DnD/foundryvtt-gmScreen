// Import TypeScript modules
import { MODULE_ABBREV, MODULE_ID, TEMPLATES } from './module/constants';
import { registerSettings } from './module/settings.js';
import { log } from './module/helpers';
import { GmScreenApplication } from './module/classes/GmScreenApplication';

Handlebars.registerHelper(`${MODULE_ABBREV}-path`, (relativePath: string) => {
  return `modules/${MODULE_ID}/${relativePath}`;
});

// async function _addGmScreenButton(html) {
//   const actionButtons = html.find('.directory-footer');

//   const gmScreenButtonHtml = await renderTemplate(TEMPLATES.button, {});

//   actionButtons.append(gmScreenButtonHtml);

//   const gmScreenButton = html.find('button.gm-screen-button');

//   gmScreenButton.on('click', (event) => {
//     event.preventDefault();

//     new GmScreenApplication().render(true);
//   });
// }

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
});

// Add any additional hooks if necessary

// Hooks.on('renderJournalDirectory', (app, html, data) => {
//   if (game.user.isGM) {
//     _addGmScreenButton(html);
//   }
// });
