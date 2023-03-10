import { GmScreenGridEntry } from '../types';
import { GmScreen } from './classes/GmScreen';
import { MODULE_ABBREV, MODULE_ID } from './constants';

export function log(force: boolean, ...args: any[]) {
  const shouldLog = force || game.modules.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID);

  if (shouldLog) {
    console.log(MODULE_ID, '|', ...args);
  }
}

export const debouncedReload = foundry.utils.debounce(() => window.location.reload(), 100);

/**
 * Creates a custom CSS property with the name provide on the element.style of all elements which match
 * the selector provided containing the computed value of the property specified.
 *
 * @param {JQuery<HTMLElement>} html - Some HTML element to search within for the selector
 * @param {string} selector - A CSS style selector which will be used to locate the target elements for this function.
 * @param {keyof CSSStyleDeclaration} property - The name of a CSS property to obtain the computed value of
 * @param {string} name - The name of the CSS variable (custom property) that will be created/updated.
 * @memberof GmScreenApplication
 */
export function updateCSSPropertyVariable(
  html: JQuery<HTMLElement>,
  selector: string,
  property: keyof CSSStyleDeclaration,
  name: string,
) {
  html.find(selector).each((i, gridCell) => {
    const value = window.getComputedStyle(gridCell)[property];
    gridCell.style.setProperty(name, String(value));
  });
}

/**
 * Helper for getting a user's cell config inputs via a dialog
 */
export function getUserCellConfigurationInput(
  cellToConfigure: GmScreenGridEntry,
  gridDetails: {
    rows: number;
    columns: number;
  },
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
          callback: () => {
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
          //@ts-expect-error idk
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
