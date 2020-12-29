import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ABBREV, MODULE_ID, MySettings, numberRegex, TEMPLATES } from '../constants';
import { getGridElementsPosition, getUserCellConfigurationInput, injectCellContents, log } from '../helpers';

enum ClickAction {
  'clearGrid' = 'clearGrid',
  'refresh' = 'refresh',
  'clearCell' = 'clearCell',
  'configureCell' = 'configureCell',
  'open' = 'open',
  'toggle-gm-screen' = 'toggle-gm-screen',
}

export class GmScreenApplication extends Application {
  data: GmScreenConfig;
  expanded: boolean;
  columns: number;
  rows: number;

  constructor(options = {}) {
    super(options);
    const data: GmScreenConfig = game.settings.get(MODULE_ID, MySettings.gmScreenConfig);
    const columns: number = game.settings.get(MODULE_ID, MySettings.columns);
    const rows: number = game.settings.get(MODULE_ID, MySettings.rows);

    this.data = data;
    this.columns = columns;
    this.rows = rows;
    this.expanded = false;
  }

  static get defaultOptions() {
    const columns: number = game.settings.get(MODULE_ID, MySettings.columns);
    const rows: number = game.settings.get(MODULE_ID, MySettings.rows);
    const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

    const drawerOptions = {
      popOut: false,
    };

    const popOutOptions = {
      classes: ['gm-screen-popOut'],
      popOut: true,
      width: Number(columns) * 400,
      height: Number(rows) * 300,
      resizable: true,
    };

    const totalCells = Number(columns) * Number(rows);
    return mergeObject(super.defaultOptions, {
      ...(displayDrawer ? drawerOptions : popOutOptions),
      template: TEMPLATES.screen,
      id: 'gm-screen-app',
      dragDrop: [{ dragSelector: '.grid-cell', dropSelector: '.grid-cell' }],
      scrollY: [...new Array(totalCells)].map((_, index) => `#gm-screen-cell-${index} .grid-cell-content`),
    });
  }

  get activeGrid() {
    return this.data.grids[this.data.activeGridId];
  }

  get numOccupiedCells() {
    return Object.values(this.activeGrid.entries).reduce((acc, entry) => {
      const cellsTaken = (entry.spanCols || 1) * (entry.spanRows || 1);
      return acc + cellsTaken;
    }, 0);
  }

  /**
   * Helper function to update the gmScreenConfig setting with a new grid's worth of data
   * @param {GmScreenGrid} newGridData - the complete grid object to set
   * @param {boolean} render - whether or not to also render the grid
   */
  async setGridData(newGridData: GmScreenGrid, render: boolean = true) {
    const newGmScreenConfig = { ...this.data };

    const updated = setProperty(newGmScreenConfig, `grids.${newGridData.id}`, newGridData);

    if (!updated) {
      // something failed
      log(true, 'error occured trying to set a grid data');
      return;
    }

    await game.settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);

    if (render) {
      this.render();
    }
  }

  /**
   * Adds an Entry to the proper place on the active grid's data.
   * Replaces an existing entry if the entryId matches
   * @param {GmScreenGridEntry} newEntry The Entry being added.
   */
  async addEntryToActiveGrid(newEntry: GmScreenGridEntry) {
    const newEntries = { ...this.activeGrid.entries };

    newEntries[newEntry.entryId] = {
      ...newEntries[newEntry.entryId],
      ...newEntry,
    };

    const newGridData: GmScreenGrid = {
      ...this.activeGrid,
      entries: newEntries,
    };

    log(false, 'addEntryToActiveGrid', {
      activeGridData: this.activeGrid,
      newEntries,
      newEntry,
      newGridData,
    });

    this.setGridData(newGridData);
  }

  /**
   * Remove a given entry from the Active Grid
   * @param {string} entryId - entry to remove from the active grid's entries
   */
  async removeEntryFromActiveGrid(entryId: string) {
    const clearedCell = this.activeGrid.entries[entryId];
    const shouldKeepCellLayout = clearedCell.spanCols || clearedCell.spanRows;

    const newEntries = {
      ...this.activeGrid.entries,
    };

    if (shouldKeepCellLayout) {
      delete clearedCell.entityUuid;
      newEntries[entryId] = clearedCell;
    } else {
      delete newEntries[entryId];
    }

    const newGridData: GmScreenGrid = {
      ...this.activeGrid,
      entries: newEntries,
    };

    this.setGridData(newGridData);
  }

  /**
   * Set the GM Screen Visibility. By default will toggle the current state.
   * @param {boolean} expanded
   */
  toggleGmScreenVisibility(expanded: boolean = !this.expanded) {
    this.expanded = expanded;

    if (this.expanded) {
      $('.gm-screen-app').addClass('expanded');
    } else {
      $('.gm-screen-app').removeClass('expanded');
    }
  }

  /**
   * Double confirms Clearing the Active Grid
   */
  handleClear() {
    log(false, 'handleClear');

    Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Title`),
      content: game.i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Content`),
      yes: async () => {
        this.setGridData({
          ...this.activeGrid,
          entries: {},
        });
      },
      no: () => {},
    });
  }

  async handleClickEvent(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    e.preventDefault();

    const action: ClickAction = e.currentTarget.dataset.action as ClickAction;
    const entityUuid = $(e.currentTarget).parents('[data-entity-uuid]')?.data()?.entityUuid;
    const entryId = $(e.currentTarget).parents('[data-entry-id]')?.data()?.entryId;

    log(false, 'handleClickEvent', {
      e,
      action,
    });

    switch (action) {
      case ClickAction.clearCell: {
        if (!entryId) {
          return;
        }
        this.removeEntryFromActiveGrid(entryId);
        break;
      }
      case ClickAction.clearGrid: {
        this.handleClear();
        break;
      }
      case ClickAction.configureCell: {
        const { x, y } = getGridElementsPosition($(e.target).parent());

        const cellToConfigure: GmScreenGridEntry = this.activeGrid.entries[entryId] || {
          x,
          y,
          entryId: `${x}-${y}`,
        };

        log(false, 'configureCell cellToConfigure', cellToConfigure);

        const { newSpanRows, newSpanCols } = await getUserCellConfigurationInput(cellToConfigure, {
          rows: this.rows,
          columns: this.columns,
        });

        log(false, 'new span values from dialog', {
          newSpanRows,
          newSpanCols,
        });

        const newCell = {
          ...cellToConfigure,
          spanRows: newSpanRows,
          spanCols: newSpanCols,
        };

        const newEntries = {
          ...this.activeGrid.entries,
          [newCell.entryId]: newCell,
        };

        // based on the X, Y, and Span values of `newCell` find all problematic entryIds
        // BRITTLE if entryId's formula changes
        const problemCoordinates = [...Array(newCell.spanCols).keys()]
          .map((_, index) => {
            const problemX = newCell.x + index;

            return [...Array(newCell.spanRows).keys()].map((_, index) => {
              const problemY = newCell.y + index;
              return `${problemX}-${problemY}`; // problem cell's id
            });
          })
          .flat();

        log(false, {
          problemCoordinates,
        });

        // get any overlapped cells and remove them
        Object.values(newEntries).forEach((entry) => {
          if (problemCoordinates.includes(entry.entryId) && entry.entryId !== newCell.entryId) {
            delete newEntries[entry.entryId];
          }
        });

        log(false, 'newEntries', newEntries);

        const newGridData = {
          ...this.activeGrid,
          entries: newEntries,
        };

        this.setGridData(newGridData);
        break;
      }
      case ClickAction.open: {
        if (!entityUuid) {
          return;
        }
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
        break;
      }
      case ClickAction.refresh: {
        this.render();
        break;
      }
      case ClickAction['toggle-gm-screen']: {
        try {
          this.toggleGmScreenVisibility();
        } catch (e) {
          log(true, 'error toggling GM Screen', e);
        }
        break;
      }
      default: {
        return;
      }
    }
  }

  /**
   * @override
   */
  activateListeners(html) {
    super.activateListeners(html);
    $(html).on('click', 'button', this.handleClickEvent.bind(this));
    $(html).on('click', 'a', this.handleClickEvent.bind(this));

    // handle select of an entity
    $(html).on('change', 'select', async (e) => {
      const gridElementPosition = getGridElementsPosition($(e.target).parent());
      const newEntryId = `${gridElementPosition.x}-${gridElementPosition.y}`;
      const newEntry: GmScreenGridEntry = {
        ...gridElementPosition,
        entryId: newEntryId,
        entityUuid: e.target.value,
      };
      this.addEntryToActiveGrid(newEntry);
    });

    $(html)
      .find('[data-entity-uuid]')
      .each(function (gridEntry) {
        // `this` is the parent .grid-cell
        const relevantUuid = this.dataset.entityUuid;

        const gridCellContent = $(this).find('.grid-cell-content');
        log(false, 'gridEntry with uuid defined found', { gridEntry: this, gridCellContent });

        injectCellContents(relevantUuid, gridCellContent);
      });

    // set some CSS Variables for child element use
    this.updateCSSPropertyVariable(html, '.grid-cell', 'width', '--this-cell-width');

    const vanillaGridElement = document.querySelector('.grid');
    const vanillaGridElementStyles = window.getComputedStyle(vanillaGridElement);
    const cols = vanillaGridElementStyles['grid-template-columns'].split(' ');
    const colWidth = cols[0];

    $(html)
      .find('.grid')
      .each((i, gridElement) => {
        gridElement.style.setProperty('--grid-cell-width', colWidth);
      });
  }

  /**
   * Creates a custom CSS property with the name provide on the element.style of all elements which match
   * the selector provided containing the computed value of the property specified.
   *
   * @param {HTMLElement} html - Some HTML element to search within for the selector
   * @param {string} selector - A CSS style selector which will be used to locate the target elements for this function.
   * @param {keyof CSSStyleDeclaration} property - The name of a CSS property to obtain the computed value of
   * @param {string} name - The name of the CSS variable (custom property) that will be created/updated.
   * @memberof GmScreenApplication
   */
  updateCSSPropertyVariable(html: HTMLElement, selector: string, property: keyof CSSStyleDeclaration, name: string) {
    $(html)
      .find(selector)
      .each((i, gridCell) => {
        const value = window.getComputedStyle(gridCell)[property];
        gridCell.style.setProperty(name, String(value));
      });
  }

  getAllActiveGridEntries() {
    return Promise.all(
      Object.values(this.activeGrid.entries).map(async (entry: GmScreenGridEntry) => {
        try {
          const relevantEntity = await fromUuid(entry.entityUuid);

          log(false, 'entity hydration', {
            relevantEntity,
            entry,
          });

          return {
            ...entry,
            type: relevantEntity?.entity,
          };
        } catch (e) {
          log(false, 'no entity for this entry', {
            entry,
          });
          return entry;
        }
      })
    );
  }

  /**
   * @override
   */
  async getData() {
    const displayDrawer: boolean = game.settings.get(MODULE_ID, MySettings.displayDrawer);

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

    const emptyCellsNum = Number(this.columns) * Number(this.rows) - this.numOccupiedCells;
    const emptyCells: Partial<GmScreenGridEntry>[] =
      emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

    const newAppData = {
      ...super.getData(),
      entityOptions,
      gridEntries: [...(await this.getAllActiveGridEntries()), ...emptyCells],
      data: this.data,
      columns: this.columns,
      rows: this.rows,
      expanded: this.expanded,
      displayDrawer,
    };

    log(false, 'getData', {
      data: this.data,
      newAppData,
    });

    return newAppData;
  }

  /**
   * @override
   */
  _getHeaderButtons() {
    const superButtons = super._getHeaderButtons();
    return [
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Reset`),
        class: 'clear',
        icon: 'fas fa-ban',
        onclick: () => this.handleClear.bind(this)(),
      },
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Refresh`),
        class: 'refresh',
        icon: 'fas fa-sync',
        onclick: () => this.render(),
      },
      ...superButtons,
    ];
  }

  /**
   * @override
   */
  async _onDrop(event) {
    event.stopPropagation();

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
      closestGridCell: $(event.currentTarget).closest('.grid-cell'),
    });

    // only move forward if this is a JournalEntry or RollTable
    if (!['JournalEntry', 'RollTable', 'Item', 'Actor'].includes(data.type)) {
      return false;
    }

    const entityUuid = `${data.type}.${data.id}`;

    const gridElementPosition = getGridElementsPosition($(event.target).closest('.grid-cell'));
    const newEntryId = `${gridElementPosition.x}-${gridElementPosition.y}`;

    const newEntry: GmScreenGridEntry = {
      ...gridElementPosition,
      entryId: newEntryId,
      entityUuid,
    };

    this.addEntryToActiveGrid(newEntry);
  }
}
