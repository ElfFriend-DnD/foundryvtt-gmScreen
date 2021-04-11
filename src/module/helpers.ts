import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from '../gridTypes';
import { getCompactGenericEntityDisplay } from './classes/CompactGenericDisplay';
import { CompactJournalEntryDisplay } from './classes/CompactJournalEntryDisplay';
import { CompactRollTableDisplay } from './classes/CompactRollTableDisplay';
import { MODULE_ABBREV, MODULE_ID, MySettings, numberRegex } from './constants';

export function log(force: boolean, ...args) {
  //@ts-ignore
  const shouldLog = force || window.DEV?.getPackageDebugValue(MODULE_ID);

  if (shouldLog) {
    console.log(MODULE_ID, '|', ...args);
  }
}

export function getUserCellConfigurationInput(
  cellToConfigure: GmScreenGridEntry,
  gridDetails: {
    rows: number;
    columns: number;
  }
) {
  return new Promise<{
    newSpanRows: number;
    newSpanCols: number;
  }>((resolve, reject) => {
    new Dialog({
      title: game.i18n.localize(`${MODULE_ABBREV}.cellConfigDialog.CellConfig`),
      content: `
  <form class="flexcol">
    <div class="form-group">
      <label for="spanRows">${game.i18n.localize(`${MODULE_ABBREV}.cellConfigDialog.RowSpan`)}</label>
      <input type="number" step="1" name="spanRows" min="1" max="${gridDetails.rows + 1 - cellToConfigure.y}" value="${
        cellToConfigure.spanRows || 1
      }">
    </div>
    <div class="form-group">
      <label for="spanCols">${game.i18n.localize(`${MODULE_ABBREV}.cellConfigDialog.ColSpan`)}</label>
      <input type="number" step="1" name="spanCols" min="1" max="${
        gridDetails.columns + 1 - cellToConfigure.x
      }" value="${cellToConfigure.spanCols || 1}">
    </div>
  </form>
`,
      buttons: {
        no: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize('Cancel'),
        },
        reset: {
          icon: '<i class="fas fa-undo"></i>',
          label: game.i18n.localize('Default'),
          callback: (html: JQuery<HTMLElement>) => {
            const formValues = {
              newSpanRows: 1,
              newSpanCols: 1,
            };

            log(false, 'dialog formValues', formValues);

            resolve(formValues);
          },
        },
        yes: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize('Submit'),
          callback: (html: JQuery<HTMLElement>) => {
            const formValues = {
              newSpanRows: Number(html.find('[name="spanRows"]').val()),
              newSpanCols: Number(html.find('[name="spanCols"]').val()),
            };

            log(false, 'dialog formValues', formValues);

            resolve(formValues);
          },
        },
      },
      default: 'yes',
      close: () => {
        reject();
      },
    }).render(true);
  });
}

export function getGridElementsPosition(element: JQuery<HTMLElement>) {
  // const vanillaGridElement = document.querySelector('.gm-screen-grid');
  const relevantGridElement = element.parents('.gm-screen-grid')[0];

  const vanillaGridElementStyles = window.getComputedStyle(relevantGridElement);

  log(false, 'getGridElementsPosition', {
    element,
    relevantGridElement,
    vanillaGridElementStyles,
    gap: vanillaGridElementStyles.gap, // wtf this is '' in firefox
    gridRowGap: vanillaGridElementStyles['grid-row-gap'],
    gridColGap: vanillaGridElementStyles['grid-column-gap'],
  });

  const gap = Number(vanillaGridElementStyles['grid-row-gap'].match(numberRegex)[0]);

  //Get the css attribute grid-template-columns from the css of class grid
  //split on whitespace and get the length, this will give you the column dimensions
  const cols = vanillaGridElementStyles['grid-template-columns'].split(' ');
  const colWidth = Number(cols[0].match(numberRegex)[0]);

  //Get the css attribute grid-template-rows from the css of class grid
  //split on whitespace and get the length, this will give you the column dimensions
  const rows = vanillaGridElementStyles['grid-template-rows'].split(' ');
  const rowHeight = Number(rows[0].match(numberRegex)[0]);

  // to figure out which column/row this element is in within the gridElement, we have to do math
  const elementBounds = element[0].getBoundingClientRect();
  const gridBounds = relevantGridElement.getBoundingClientRect();

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

export async function injectCellContents(entityUuid: string, gridCellContentElement: JQuery<HTMLElement>) {
  const relevantEntity = await fromUuid(entityUuid);

  if (!relevantEntity) {
    console.warn('One of the grid cells tried to render an entity that does not exist.');
    return;
  }

  // cleanup old cell renderings
  Object.values(relevantEntity.apps).forEach(async (app) => {
    //@ts-ignore
    if (app.targetElement) {
      log(false, 'cleaning up old apps', relevantEntity.entity, app.appId);
      delete relevantEntity.apps[app.appId];

      await app.close();
    }
  });

  switch (relevantEntity.entity) {
    case 'RollTable': {
      const compactRollTableDisplay = new CompactRollTableDisplay(relevantEntity, gridCellContentElement);

      log(false, 'try rendering compactRollTable', {
        relevantEntity,
        compactRollTableDisplay,
      });

      compactRollTableDisplay.render(true);

      break;
    }
    case 'JournalEntry': {
      let compactJournalEntryDisplay;

      if (!(relevantEntity.sheet instanceof JournalSheet)) {
        const CompactJournalEntrySheet = getCompactGenericEntityDisplay(relevantEntity.sheet);

        compactJournalEntryDisplay = new CompactJournalEntrySheet(relevantEntity, gridCellContentElement);
      } else {
        compactJournalEntryDisplay = new CompactJournalEntryDisplay(relevantEntity, gridCellContentElement);
      }

      log(false, 'try rendering compactJournalEntry', {
        relevantEntity,
        compactJournalEntryDisplay,
      });

      gridCellContentElement.addClass(compactJournalEntryDisplay.options.classes.join(' '));

      compactJournalEntryDisplay.render(true);

      break;
    }
    case 'Actor':
    case 'Item': {
      const SystemSpecificItemDisplayClass = getCompactGenericEntityDisplay(relevantEntity.sheet as BaseEntitySheet);

      const entityDisplay = new SystemSpecificItemDisplayClass(relevantEntity, gridCellContentElement);

      log(false, 'try rendering an Item', {
        entityDisplay,
      });

      //@ts-ignore
      gridCellContentElement.addClass(entityDisplay.options.classes.join(' '));

      //@ts-ignore
      entityDisplay.render(true);
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

export function getUserViewableGrids() {
  const gmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig) as GmScreenConfig;

  if (game.user.isGM) {
    return gmScreenConfig.grids;
  }

  const sharedGrids = Object.keys(gmScreenConfig.grids).reduce((acc, gridId) => {
    if (gmScreenConfig.grids[gridId].isShared) {
      acc[gridId] = gmScreenConfig.grids[gridId];
    }

    return acc;
  }, {});

  return sharedGrids;
}
