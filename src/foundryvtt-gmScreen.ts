// Import TypeScript modules
import { MODULE_ID, MySettings, TEMPLATES } from './module/constants';
import { registerSettings } from './module/settings.js';
import { getGridElementsPosition, log } from './module/helpers';
import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from './gridTypes';

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 175;

function _addGmScreenButton(html) {
  const actionButtons = html.find('.action-buttons');

  const gmScreenButtonHtml = `<button class="gm-screen-button">
          <i class="fas fa-cog"></i> GM Screen
      </button>`;

  actionButtons.append(gmScreenButtonHtml);

  const gmScreenButton = html.find('button.gm-screen-button');

  gmScreenButton.on('click', (event) => {
    event.preventDefault();

    new GmScreenApplication().render(true);
  });
}

class GmScreenApplication extends Application {
  data: any;

  constructor(options = {}) {
    super(options);

    this.data = {};
  }

  static get defaultOptions() {
    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const totalCells = data.grid.columns * data.grid.rows;

    return mergeObject(super.defaultOptions, {
      classes: ['app', 'gm-screen'],
      title: 'GM Screen',
      template: TEMPLATES.screen,
      minimizable: true,
      resizable: true,
      width: data.grid.columns * COLUMN_WIDTH,
      height: data.grid.rows * ROW_HEIGHT,
      scrollY: [...new Array(totalCells)].map((_, index) => `#gm-screen-cell-${index} .grid-cell-content`),
    });
  }

  activateListeners(html) {
    $('button').on('click', async (e) => {
      log(false, 'clear');
      const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

      const action = e.target.dataset.action;

      if (action === 'clearGrid') {
        await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
          ...data,
          grid: {
            ...data.grid,
            entries: [],
          },
        });
        this.render();
      }

      if (action === 'refresh') {
        this.render();
      }
    });

    // handle select of a journal entry
    $(html).on('change', 'select', async (e) => {
      const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
      const newEntries = [...data.grid.entries];

      const newEntry: GmScreenGridEntry = {
        ...getGridElementsPosition($(e.target).parent()),
        journalId: e.target.value,
      };

      const existingEntryIndex = newEntries.findIndex((entry) => {
        return entry.x === newEntry.x && entry.y === newEntry.y;
      });

      if (existingEntryIndex > -1) {
        newEntries[existingEntryIndex] = newEntry;
      } else {
        newEntries.push(newEntry);
      }

      await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
        ...data,
        grid: {
          ...data.grid,
          entries: newEntries,
        },
      });

      this.render();
    });
  }

  getData() {
    const appData = super.getData();

    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    appData.journalOptions = ((game.journal.entries as unknown) as Array<any>).reduce((acc, entry) => {
      // log(false, { entry, acc });
      acc[entry.id] = entry.data.name;
      return acc;
    }, {});

    const emptyCellsNum = data.grid.columns * data.grid.rows - data.grid.entries.length;
    const emptyCells = emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];
    appData.gridEntries = [...data.grid.entries, ...emptyCells].map((entry: GmScreenGridEntry) => {
      if (entry.journalId) {
        const relevantJournalEntry = game.journal.get(entry.journalId);
        log(false, { relevantJournalEntry });
        return {
          ...entry,
          // @ts-ignore
          journalContent: new Handlebars.SafeString(TextEditor.enrichHTML(relevantJournalEntry.data?.content)),
        };
      }
      return entry;
    });

    appData.data = data;

    log(false, 'getData', {
      data,
      appData,
    });

    return appData;
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
