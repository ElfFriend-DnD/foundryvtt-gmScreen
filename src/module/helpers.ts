import { GmScreenConfig } from '../gridTypes';
import { CompactJournalEntryDisplay } from './classes/CompactJournalEntryDisplay';
import { CompactRollTableDisplay } from './classes/CompactRollTableDisplay';
import { MODULE_ID, MySettings, numberRegex } from './constants';

export function log(force: boolean, ...args) {
  if (force || CONFIG[MODULE_ID].debug === true) {
    console.log(MODULE_ID, '|', ...args);
  }
}

export function getGridElementsPosition(element: JQuery<HTMLElement>) {
  const gridElement = $('.grid');

  log(false, 'getGridElementsPosition', {
    element,
    gridElement,
  });

  const gap = Number(gridElement.css('gap').match(numberRegex)[0]);

  //Get the css attribute grid-template-columns from the css of class grid
  //split on whitespace and get the length, this will give you the column dimensions
  const cols = gridElement.css('grid-template-columns').split(' ');
  const colWidth = Number(cols[0].match(numberRegex)[0]);

  //Get the css attribute grid-template-rows from the css of class grid
  //split on whitespace and get the length, this will give you the column dimensions
  const rows = gridElement.css('grid-template-rows').split(' ');
  const rowHeight = Number(rows[0].match(numberRegex)[0]);

  // to figure out which column/row this element is in within the gridElement, we have to do math
  const elementBounds = element[0].getBoundingClientRect();
  const gridBounds = gridElement[0].getBoundingClientRect();

  const elementColumn = Math.floor((elementBounds.left - (gridBounds.left - gap)) / (colWidth + gap)) + 1;

  const elementRow = Math.floor((elementBounds.top - (gridBounds.top - gap)) / (rowHeight + gap)) + 1;

  log(false, 'getGridElementsPosition', {
    setup: {
      gap,
      cols,
      rows,
      elementBounds,
      gridBounds,
      colWidth,
      rowHeight,
    },
    results: {
      elementColumn,
      elementRow,
    },
  });
  //Return an object with properties row and column
  return { y: elementRow, x: elementColumn };
}

export function getRollTableTemplateData(rollTable: RollTable) {
  const data = new RollTableConfig(rollTable).getData();
  log(false, 'getRollTableTemplateData', {
    rollTable,
    data,
  });

  return data;
}

export async function injectCellContents(entityUuid: string, gridCellContentElement: JQuery<HTMLElement>) {
  const relevantEntity = await fromUuid(entityUuid);

  switch (relevantEntity.entity) {
    case 'RollTable': {
      const compactRollTableDisplay = new CompactRollTableDisplay(relevantEntity, gridCellContentElement);

      log(false, 'try rendering compactRollTable', {
        compactRollTableDisplay,
      });

      compactRollTableDisplay.render(true);

      break;
    }
    case 'JournalEntry': {
      const compactJournalEntryDisplay = new CompactJournalEntryDisplay(relevantEntity, gridCellContentElement);

      log(false, 'try rendering compactJournalEntry', {
        compactJournalEntryDisplay,
      });

      compactJournalEntryDisplay.render(true);

      break;
    }
    default: {
      const sheetClasses = relevantEntity.sheet.options.classes;

      log(false, "use the entity's sheet", {
        sheetClasses,
      });

      gridCellContentElement.addClass(sheetClasses.join(' '));

      // @ts-ignore
      const entitySheetInner = await relevantEntity.sheet._renderInner(relevantEntity.sheet.getData());

      gridCellContentElement.append(entitySheetInner);
    }
  }
}

export async function handleClickEvents(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
  e.preventDefault();
  const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);

  const action = e.currentTarget.dataset.action;
  const entityUuid = $(e.currentTarget).parents('[data-entity-uuid]')?.data()?.entityUuid;

  log(false, e.currentTarget.localName, 'clicked', {
    e,
    target: e.currentTarget,
    dataset: e.currentTarget.dataset,
    entityUuid,
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
      log(true, 'error opening entity sheet', e);
    }
  }

  if (action === 'toggle-gm-screen') {
    try {
      this.toggleGmScreenVisibility();

      // this.render();
    } catch (e) {
      log(true, 'error toggling GM Screen', e);
    }
  }
}
