import { GmScreenConfig, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { getGridElementsPosition, getItemSheet, getRollTableTemplateData, handleClickEvents, log } from '../helpers';

export class GmScreenApplication extends Application {
  data: any;
  expanded: boolean;

  constructor(options = {}) {
    super(options);

    this.data = {};
    this.expanded = false;
  }

  static get defaultOptions() {
    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const totalCells = data.grid.columns * data.grid.rows;
    return mergeObject(super.defaultOptions, {
      template: TEMPLATES.screen,
      id: 'gm-screen-app',
      dragDrop: [{ dragSelector: '.grid-cell', dropSelector: '.grid-cell' }],
      popOut: false,
      scrollY: [...new Array(totalCells)].map((_, index) => `#gm-screen-cell-${index} .grid-cell-content`),
    });
  }

  /**
   * Adds an Entry to the proper place on the grid data.
   * Replaces an existing entry if the X and Y match
   * @param newEntry The Entry being added.
   */
  async addEntry(newEntry: GmScreenGridEntry) {
    const gridData: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
    const newEntries = [...gridData.grid.entries];

    const existingEntryIndex = newEntries.findIndex((entry) => {
      return entry.x === newEntry.x && entry.y === newEntry.y;
    });

    if (existingEntryIndex > -1) {
      newEntries[existingEntryIndex] = newEntry;
    } else {
      newEntries.push(newEntry);
    }

    await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
      ...gridData,
      grid: {
        ...gridData.grid,
        entries: newEntries,
      },
    });

    this.render();
  }

  toggleGmScreenVisibility() {
    this.expanded = !this.expanded;

    if (this.expanded) {
      $('.gm-screen-app').addClass('expanded');
    } else {
      $('.gm-screen-app').removeClass('expanded');
    }
  }

  activateListeners(html) {
    super.activateListeners(html);
    $(html).on('click', 'button', handleClickEvents.bind(this));
    $(html).on('click', 'a', handleClickEvents.bind(this));

    // handle select of an entity
    $(html).on('change', 'select', async (e) => {
      const newEntry: GmScreenGridEntry = {
        ...getGridElementsPosition($(e.target).parent()),
        entityUuid: e.target.value,
      };
      this.addEntry(newEntry);
    });
  }

  async getData() {
    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const journalOptions = ((game.journal.entries as unknown) as Array<any>).reduce((acc, journalEntry) => {
      acc[journalEntry.uuid] = journalEntry.data.name;
      return acc;
    }, {});

    const rollTableOptions = ((game.tables.entries as unknown) as Array<any>).reduce((acc, rollTableEntry) => {
      acc[rollTableEntry.uuid] = rollTableEntry.data.name;
      return acc;
    }, {});

    const itemOptions = ((game.items.entries as unknown) as Array<any>).reduce((acc, itemEntry) => {
      acc[itemEntry.uuid] = itemEntry.data.name;
      return acc;
    }, {});

    const emptyCellsNum = data.grid.columns * data.grid.rows - data.grid.entries.length;
    const emptyCells: GmScreenGridEntry[] = emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

    const getAllGridEntries = async () => {
      return Promise.all(
        [...data.grid.entries, ...emptyCells].map(async (entry: GmScreenGridEntry) => {
          if (entry.entityUuid) {
            const relevantEntity = await fromUuid(entry.entityUuid);

            if (relevantEntity instanceof JournalEntry) {
              log(false, 'journalEntry found', { entry, relevantEntity });
              return {
                ...entry,
                // @ts-ignore
                journalContent: new Handlebars.SafeString(TextEditor.enrichHTML(relevantEntity.data?.content)),
              };
            }

            if (relevantEntity instanceof RollTable) {
              log(false, 'rollTable found', { entry, relevantEntity });

              const rollTableTemplateData = getRollTableTemplateData(relevantEntity);

              return {
                ...entry,
                rollTableTemplateData,
              };
            }

            if (relevantEntity instanceof Item) {
              const itemSheetHtml = await getItemSheet(relevantEntity);
              log(false, 'item found', { entry, relevantEntity, itemSheetHtml });

              return {
                ...entry,
                //@ts-ignore
                itemSheetTemplate: itemSheetHtml.html(),
              };
            }
          }
          log(false, 'returning');
          return entry;
        })
      );
    };

    const newAppData = {
      ...super.getData(),
      journalOptions,
      rollTableOptions,
      itemOptions,
      gridEntries: await getAllGridEntries(),
      data,
      expanded: this.expanded,
    };

    log(false, 'getData', {
      data,
      newAppData,
    });

    return newAppData;
  }

  async _onDrop(event) {
    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return false;
    }

    log(false, 'onDrop', {
      event,
      data,
      closestGridCell: $(event.target).closest('.grid-cell'),
    });

    // only move forward if this is a JournalEntry or RollTable
    if (!['JournalEntry', 'RollTable', 'Item'].includes(data.type)) {
      return false;
    }

    const entityUuid = `${data.type}.${data.id}`;

    const newEntry: GmScreenGridEntry = {
      ...getGridElementsPosition($(event.target).closest('.grid-cell')),
      entityUuid,
    };

    this.addEntry(newEntry);
  }
}
