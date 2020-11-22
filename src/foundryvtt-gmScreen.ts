// Import TypeScript modules
import { MODULE_ID, MySettings, TEMPLATES } from './module/constants';
import { registerSettings } from './module/settings.js';
import { log } from './module/helpers';

function _addGmScreenButton(html) {
  const actionButtons = html.find('.action-buttons');

  const gmScreenButtonHtml = `<button class="gm-screen-button">
          <i class="fas fa-cog"></i> GM Screen
      </button>`;

  actionButtons.append(gmScreenButtonHtml);

  const gmScreenButton = html.find('button.gm-screen-button');

  gmScreenButton.on('click', (event) => {
    event.preventDefault();
    const data = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    new GmScreen().render(true);
  });
}

class GmScreen extends Application {
  data: any;

  constructor(options = {}) {
    super(options);

    this.data = {};
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ['app', 'gm-screen'],
      template: TEMPLATES.screen,
      minimizable: true,
      resizable: true,
    });
  }
}

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
});

// Add any additional hooks if necessary

Hooks.on('renderJournalDirectory', (app, html, data) => {
  _addGmScreenButton(html);
});
