import { GmScreenConfig, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ID, MySettings, TEMPLATES } from '../constants';
import { getGridElementsPosition, getRollTableTemplateData, log } from '../helpers';

const COLUMN_WIDTH = 200;
const ROW_HEIGHT = 175;

async function handleClickEvents(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
  e.preventDefault();
  const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

  const action = e.currentTarget.dataset.action;
  const entityUuid = e.currentTarget.dataset.entityUuid;

  log(false, e.currentTarget.localName, 'clicked', {
    e,
    target: e.currentTarget,
    dataset: e.currentTarget.dataset,
    action,
    data,
  });

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

  if (action === 'rolltable' && !!entityUuid) {
    try {
      const relevantRollTable = (await fromUuid(entityUuid)) as RollTable;
      log(false, 'trying to roll table', { relevantRollTable });

      relevantRollTable.draw();
    } catch (e) {
      log(true, 'error rolling table', e);
    }
  }

  if (action === 'open' && !!entityUuid) {
    try {
      const relevantEntity = await fromUuid(entityUuid);
      const relevantEntitySheet = relevantEntity?.sheet;
      log(false, 'trying to edit entity', { relevantEntitySheet });

      // If the relevantEntitySheet is already rendered:
      if (relevantEntitySheet.rendered) {
        relevantEntitySheet.maximize();
        //@ts-ignore
        relevantEntitySheet.bringToTop();
      }

      // Otherwise render the relevantEntitySheet
      else relevantEntitySheet.render(true);
    } catch (e) {
      log(true, 'error rolling table', e);
    }
  }
}

export class GmScreenApplication extends Application {
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
      id: 'gm-screen-app',
      minimizable: true,
      resizable: true,
      width: data.grid.columns * COLUMN_WIDTH,
      height: data.grid.rows * ROW_HEIGHT,
      scrollY: [...new Array(totalCells)].map((_, index) => `#gm-screen-cell-${index} .grid-cell-content`),
    });
  }

  activateListeners(html) {
    $(html).on('click', 'button', handleClickEvents.bind(this));
    $(html).on('click', 'a', handleClickEvents.bind(this));

    // handle select of an entity
    $(html).on('change', 'select', async (e) => {
      const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
      const newEntries = [...data.grid.entries];

      const newEntry: GmScreenGridEntry = {
        ...getGridElementsPosition($(e.target).parent()),
        entityUuid: e.target.value,
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
      gridEntries: await getAllGridEntries(),
      data,
    };

    log(false, 'getData', {
      data,
      newAppData,
    });

    return newAppData;
  }
}
