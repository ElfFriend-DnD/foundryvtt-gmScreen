import { MODULE_ID, numberRegex } from './constants';

export function log(force: boolean, ...args) {
  if (force || CONFIG[MODULE_ID].debug === true) {
    console.log(MODULE_ID, '|', ...args);
  }
}

export function getGridElementsPosition(element: JQuery<HTMLElement>) {
  const gridElement = $('.grid');

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

  const elementColumn = Math.floor((elementBounds.left - gridBounds.left) / (colWidth + gap)) + 1;

  const elementRow = Math.floor((elementBounds.top - gridBounds.top) / (rowHeight + gap)) + 1;

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
