import { GmScreenConfig, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { getGridElementsPosition, handleClickEvents, log } from '../helpers';

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

    const entityOptions = [
      { label: 'ENTITY.Actor', entries: game.actors.entries },
      { label: 'ENTITY.Item', entries: game.items.entries },
      { label: 'ENTITY.JournalEntry', entries: game.journal.entries },
      { label: 'ENTITY.RollTable', entries: game.tables.entries },
    ].map(({ label, entries }) => {
      return {
        label,
        options: ((entries as unknown) as Array<any>).reduce((acc, entity) => {
          acc[entity.uuid] = entity.data.name;
          return acc;
        }, {}),
      };
    });

    const emptyCellsNum = data.grid.columns * data.grid.rows - data.grid.entries.length;
    const emptyCells: GmScreenGridEntry[] = emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

    const getAllGridEntries = async () => {
      return Promise.all(
        [...data.grid.entries, ...emptyCells].map(async (entry: GmScreenGridEntry) => {
          if (entry.entityUuid) {
            const relevantEntity = await fromUuid(entry.entityUuid);

            const relevantSheetData = relevantEntity.sheet.getData();
            const uneditableSheetData = {
              ...relevantSheetData,
              options: {
                ...relevantSheetData.options,
                editable: false,
              },
              editable: false,
              cssClass: 'locked',
            };

            const sheetDataClasses = relevantSheetData.cssClass;
            const entitySheetClasses = relevantEntity.sheet.options.classes.join(' ');

            // @ts-ignore
            const entitySheetInner = await relevantEntity.sheet._renderInner(uneditableSheetData);

            log(false, 'entity population', {
              relevantEntity,
              // itemSheet,
              // itemSheetData,
              relevantSheetData,
              uneditableSheetData,
              entitySheetInner,
            });

            return {
              ...entry,
              //@ts-ignore
              entitySheetInnerHtml: entitySheetInner.html(),
              entitySheetClasses,
            };

            // if (relevantEntity instanceof JournalEntry) {
            //   log(false, 'journalEntry found', { entry, relevantEntity });
            //   return {
            //     ...entry,
            //     // @ts-ignore
            //     journalContent: new Handlebars.SafeString(TextEditor.enrichHTML(relevantEntity.data?.content)),
            //   };
            // }

            // if (relevantEntity instanceof RollTable) {
            //   log(false, 'rollTable found', { entry, relevantEntity });

            //   const rollTableTemplateData = getRollTableTemplateData(relevantEntity);

            //   return {
            //     ...entry,
            //     rollTableTemplateData,
            //   };
            // }

            // if (relevantEntity instanceof Item) {
            //   const itemSheetHtml = await getItemSheet(relevantEntity);
            //   log(false, 'item found', { entry, relevantEntity, itemSheetHtml });

            //   return {
            //     ...entry,
            //     //@ts-ignore
            //     itemSheetTemplate: itemSheetHtml.html(),
            //   };
            // }

            // if (relevantEntity instanceof Actor) {
            //   const actorSheetHtml = await getActorSheet(relevantEntity);
            //   log(false, 'item found', { entry, relevantEntity, actorSheetHtml });

            //   return {
            //     ...entry,
            //     //@ts-ignore
            //     actorSheetTemplate: actorSheetHtml.html(),
            //   };
            // }
          }
          log(false, 'returning');
          return entry;
        })
      );
    };

    const newAppData = {
      ...super.getData(),
      entityOptions,
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
    if (!['JournalEntry', 'RollTable', 'Item', 'Actor'].includes(data.type)) {
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
