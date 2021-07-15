import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from '../../gridTypes';
import { MODULE_ABBREV, MODULE_ID, MyHooks, MySettings, TEMPLATES } from '../constants';
import {
  getGame,
  getGridElementsPosition,
  getUserCellConfigurationInput,
  getUserViewableGrids,
  log,
  updateCSSPropertyVariable,
} from '../helpers';
import { CompactJournalEntryDisplay } from './CompactJournalEntryDisplay';
import { CompactRollTableDisplay } from './CompactRollTableDisplay';
import { GmScreenSettings } from './GmScreenSettings';

enum ClickAction {
  'clearGrid' = 'clearGrid',
  'refresh' = 'refresh',
  'clearCell' = 'clearCell',
  'configureCell' = 'configureCell',
  'open' = 'open',
  'toggle-gm-screen' = 'toggle-gm-screen',
  'setActiveGridId' = 'setActiveGridId',
}

type GmScreenApp = ActorSheet | ItemSheet | JournalSheet | RollTableConfig;

export class GmScreenApplication extends Application {
  expanded: boolean;
  data: GmScreenConfig;
  apps: Record<string, GmScreenApp>;

  constructor(options = {}) {
    super(options);
    this.expanded = false;
    this.data = getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig);
    this.apps = {};
  }

  get rows() {
    return getGame().settings.get(MODULE_ID, MySettings.rows);
  }

  get columns() {
    return getGame().settings.get(MODULE_ID, MySettings.columns);
  }

  get displayDrawer() {
    return getGame().settings.get(MODULE_ID, MySettings.displayDrawer);
  }

  get userViewableGrids() {
    return getUserViewableGrids(this.data);
  }

  get hasUserViewableGrids() {
    return !!Object.keys(this.userViewableGrids).length;
  }

  static get defaultOptions() {
    const columns = getGame().settings.get(MODULE_ID, MySettings.columns);
    const rows = getGame().settings.get(MODULE_ID, MySettings.rows);
    const displayDrawer = getGame().settings.get(MODULE_ID, MySettings.displayDrawer);
    const gmScreenConfig = getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig);

    const drawerOptions = {
      popOut: false,
    };

    const popOutOptions = {
      classes: ['gm-screen-popOut'],
      popOut: true,
      width: Number(columns) * 400,
      height: Number(rows) * 300,
      resizable: true,
      title: getGame().i18n.localize(`${MODULE_ABBREV}.gmScreen.Title`),
    };

    const gmOptions = {
      dragDrop: [{ dragSelector: '.gm-screen-grid-cell', dropSelector: '.gm-screen-grid-cell' }],
    };

    // set all of the cells of all the grids to be scrollY managed
    const scrollY = Object.keys(gmScreenConfig.grids).reduce((acc, gridKey) => {
      const gridColumns = gmScreenConfig.grids[gridKey].columnOverride ?? columns;
      const gridRows = gmScreenConfig.grids[gridKey].rowOverride ?? rows;

      const totalCells = Number(gridColumns) * Number(gridRows);

      const gridKeyScrollY = [...new Array(totalCells)].map(
        (_, index) => `#gm-screen-${gridKey}-cell-${index} .gm-screen-grid-cell-content`
      );
      return acc.concat(gridKeyScrollY);
    }, [] as string[]);

    log(false, {
      displayDrawer,
      options: displayDrawer ? drawerOptions : popOutOptions,
    });

    return foundry.utils.mergeObject(super.defaultOptions, {
      ...(displayDrawer ? drawerOptions : popOutOptions),
      ...(getGame().user?.isGM
        ? gmOptions
        : {
            dragDrop: [],
          }),
      tabs: [
        {
          navSelector: '.tabs',
          contentSelector: '.gm-screen-app',
          initial: gmScreenConfig.activeGridId ?? 'default',
        },
      ],
      template: TEMPLATES.screen,
      id: 'gm-screen-app',
      scrollY,
    });
  }

  get activeGrid() {
    return this.data.grids[this.data.activeGridId];
  }

  static getNumOccupiedCells(grid: GmScreenGrid) {
    return Object.values(grid.entries).reduce((acc, entry) => {
      const cellsTaken = (entry.spanCols || 1) * (entry.spanRows || 1);
      return acc + cellsTaken;
    }, 0);
  }

  /**
   * Helper function to update the gmScreenConfig setting with a new grid's worth of data
   * @param {GmScreenGrid} newGridData - the complete grid object to set
   * @param {boolean} render - ⚠️ DEPRECATED since 2.4.0: whether or not to also render/refresh the grid
   */
  async setGridData(newGridData: GmScreenGrid, render: boolean = true) {
    const newGmScreenConfig = foundry.utils.deepClone(this.data);

    const updated = setProperty(newGmScreenConfig, `grids.${newGridData.id}`, newGridData);

    if (!updated) {
      // something failed
      log(true, 'error occurred trying to set a grid data');
      return;
    }

    // changing this setting will auto-refresh the screen
    await getGame().settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);

    // if (render) {
    //   this.refresh();
    // }
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
  async removeEntryFromActiveGrid(entryId: string, gridCellId?: string) {
    const clearedCell = foundry.utils.deepClone(this.activeGrid.entries[entryId]);
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

    if (gridCellId) {
      const appKey = `#${gridCellId}`;
      await this.apps[appKey].close();
      delete this.apps[appKey];
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
    // TODO: Allow toggling open to a specific tab
    // TODO: Provide API for other modules to know what tabs exist
    this.expanded = expanded;

    const activeGridDetails = {
      activeGridId: this.data.activeGridId,
      activeGridName: this.data.grids[this.data.activeGridId]?.name,
    };

    if (this.expanded) {
      ui.windows[this.appId] = this; // add our window to the stack, pretending we are an open Application

      this.bringToTop();

      $('.gm-screen-app').addClass('expanded');

      // on open, call MyHooks.openClose with isOpen: true and the active grid details
      Hooks.callAll(MyHooks.openClose, this, {
        isOpen: true,
        ...activeGridDetails,
      });
    } else {
      $('.gm-screen-app').removeClass('expanded');
      delete ui.windows[this.appId]; // remove our window to the stack, pretending we are a closed Application

      // on open, call MyHooks.openClose with isOpen: false and the active grid details
      Hooks.callAll(MyHooks.openClose, this, {
        isOpen: false,
        ...activeGridDetails,
      });
    }
  }

  /**
   * Double confirms Clearing the Active Grid
   */
  handleClear() {
    log(false, 'handleClear');

    Dialog.confirm({
      title: getGame().i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Title`),
      content: getGame().i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Content`),
      yes: async () => {
        this.apps = {};
        this.setGridData({
          ...this.activeGrid,
          entries: {},
        });
      },
      no: () => {},
    });
  }

  _dragListeners(html: JQuery<any>) {
    let draggedTab: HTMLElement | undefined;
    const tabElement = html.find('.gm-screen-tabs');

    tabElement.on('dragstart', '.item', (e) => {
      draggedTab = e.target;
    });

    tabElement.on('dragover', (e) => {
      if (!draggedTab) {
        return;
      }

      let children = Array.from($(e.target).closest('.gm-screen-tabs').children());

      if (children.indexOf(e.target) > children.indexOf(draggedTab)) {
        e.target.after(draggedTab);
      } else {
        e.target.before(draggedTab);
      }
    });

    tabElement.on('dragend', async (e) => {
      if (!draggedTab) {
        return;
      }

      const newGmScreenConfig = foundry.utils.deepClone(this.data);
      newGmScreenConfig.grids = {};

      // rebuild gmScreenConfig based on the current layout of the tabs
      $(e.target)
        .closest('.gm-screen-tabs')
        .children()
        .each((index, item) => {
          const gridId = $(item).attr('data-tab');
          if (!gridId) {
            return;
          }
          newGmScreenConfig.grids[gridId] = this.data.grids[gridId];
        });

      draggedTab = undefined;
      await getGame().settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);
    });
  }

  async handleClickEvent(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    e.preventDefault();

    const action = e.currentTarget.dataset.action as ClickAction;
    const entityUuid = $(e.currentTarget).parents('[data-entity-uuid]')?.data()?.entityUuid;
    const entryId = $(e.currentTarget).parents('[data-entry-id]')?.data()?.entryId;
    const gridCellId = $(e.currentTarget).parents('[data-entry-id]')?.attr('id');

    log(false, 'handleClickEvent', {
      e,
      action,
    });

    switch (action) {
      case ClickAction.clearCell: {
        if (!entryId) {
          return;
        }

        this.removeEntryFromActiveGrid(entryId, gridCellId);
        break;
      }
      case ClickAction.clearGrid: {
        this.handleClear();
        break;
      }
      case ClickAction.configureCell: {
        try {
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
        } catch (e) {
          log(false, 'User exited configure cell Dialog.');
        }
        break;
      }
      case ClickAction.open: {
        if (!entityUuid) {
          return;
        }
        try {
          const relevantDocument = await this.getRelevantGmScreenDocument(entityUuid);
          const relevantDocumentSheet = relevantDocument?.sheet;
          log(false, 'trying to edit entity', { relevantEntitySheet: relevantDocumentSheet });

          if (!relevantDocumentSheet) {
            return;
          }

          // If the relevantEntitySheet is already rendered:
          if (relevantDocumentSheet.rendered) {
            relevantDocumentSheet.maximize();
            relevantDocumentSheet.bringToTop();
          }

          // Otherwise render the relevantEntitySheet
          else relevantDocumentSheet.render(true);
        } catch (error) {
          log(true, 'error opening entity sheet', error);
        }
        break;
      }
      case ClickAction.refresh: {
        this.refresh();
        break;
      }
      case ClickAction.setActiveGridId: {
        const newActiveGridId = e.currentTarget.dataset.tab;
        // do nothing if we are not the GM or if nothing changes
        if (!getGame().user?.isGM || newActiveGridId === this.data.activeGridId || !newActiveGridId) {
          return;
        }

        log(false, 'trying to set active grid', { newActiveGridId });

        try {
          const newGmScreenConfig = {
            ...this.data,
            activeGridId: newActiveGridId,
          };

          await getGame().settings.set(MODULE_ID, MySettings.gmScreenConfig, newGmScreenConfig);
        } catch (error) {
          log(true, 'error setting active tab', error);
        }
        break;
      }
      case ClickAction['toggle-gm-screen']: {
        try {
          this.toggleGmScreenVisibility();
        } catch (error) {
          log(true, 'error toggling GM Screen', error);
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
  render(...args) {
    if (!this.hasUserViewableGrids && this.rendered) {
      this.close();
    }

    return super.render(...args);
  }

  /**
   * This currently thinly wraps `this.render`, but might be more complicated in the future.
   */
  refresh() {
    const newData = getGame().settings.get(MODULE_ID, MySettings.gmScreenConfig);
    const oldData = foundry.utils.deepClone(this.data);
    const diffData: Partial<GmScreenConfig> = foundry.utils.diffObject(oldData, newData);

    log(false, 'refreshing gm screen', {
      newData: foundry.utils.deepClone(newData),
      data: oldData,
      diffData,
    });

    this.data = newData;

    if (Object.keys(diffData).length) {
      if (Object.keys(diffData).every((key) => key === 'activeGridId')) {
        log(false, 'not rerendering because only activeGridId changed');
        return;
      }

      const diffGridIds = Object.keys(diffData?.grids ?? {});
      const myNewGridIds = Object.keys(this.userViewableGrids);
      const myOldGridIds = Object.keys(getUserViewableGrids(oldData));

      // 1. check if the gridIds in diffData have no overlap with the gridIds I can currently see

      const diffOverlapsNewGridIds = !diffGridIds.filter((gridId) => myNewGridIds.includes(gridId)).length;
      // expect this to be false if there is overlap;

      // 2. check if the gridIds I can currently see are the same as before the diff

      const oldAndNewGridIdsAreEqual =
        myNewGridIds.length === myOldGridIds.length && myNewGridIds.every((gridId) => myOldGridIds.includes(gridId));
      // expect this to be true if same

      // 3. IF 1 AND 2; don't rerender

      const shouldNotRerender = diffOverlapsNewGridIds && oldAndNewGridIdsAreEqual;

      log(false, 'gridIdChecks', {
        diffGridIds,
        myOldGridIds,
        myNewGridIds,
        diffOverlapsNewGridIds,
        oldAndNewGridIdsAreEqual,
        shouldNotRerender,
      });

      if (shouldNotRerender) {
        log(false, 'not rerendering because none of my visible grids changed');
        return;
      }
    }

    this.render();
  }

  /**
   * @override
   */
  activateListeners(html) {
    super.activateListeners(html);

    if (this.displayDrawer) {
      // bring to top on click
      $(html).on('mousedown', (event) => {
        log(false, 'buttons', event.buttons);
        if (event.buttons === 2) {
          return;
        }
        this.bringToTop();
      });
    }

    if (getGame().user?.isGM) {
      this._dragListeners(html);
    }

    $('.gm-screen-button').on('contextmenu', () => {
      const config = new GmScreenSettings({});
      config.render(true);
    });

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

    // stop here if there are no user viewable grids
    if (!this.hasUserViewableGrids) {
      return;
    }

    this.injectCellContents(html);

    // populate the --grid-cell-width variable
    const vanillaGridElement = document.querySelector('.gm-screen-grid');
    if (!vanillaGridElement) {
      return;
    }
    const vanillaGridElementStyles = getComputedStyle(vanillaGridElement);
    const cols = vanillaGridElementStyles['grid-template-columns'].split(' ');
    const colWidth = cols[0];

    $(html)
      .find('.gm-screen-grid')
      .each((i, gridElement) => {
        gridElement.style.setProperty('--grid-cell-width', colWidth);
      });
  }

  /**
   * Utility method to help typescript understand that these are only
   * actors, items, journals, or rolltables
   *
   * @param entityUuid - relevant entityUuid
   */
  async getRelevantGmScreenDocument(entityUuid) {
    const relevantDocument = await fromUuid(entityUuid);

    if (
      !(
        relevantDocument instanceof Actor ||
        relevantDocument instanceof Item ||
        relevantDocument instanceof JournalEntry ||
        relevantDocument instanceof RollTable
      )
    ) {
      return;
    }

    return relevantDocument;
  }

  /**
   * create and cache the custom Application when we need to during GmScreenApplication.render();
   * and then use that cached Application instance to render
   *
   * @param entityUuid - Identifier for the Entity in the cell
   * @param cellId - Identifier for the Cell
   * @param gridCellContentElement - the element to inject into
   * @returns
   */
  async getCellApplicationClass(entityUuid: string, cellId: string) {
    const relevantDocument = await this.getRelevantGmScreenDocument(entityUuid);

    if (!relevantDocument) {
      await this.apps[cellId]?.close();
      delete this.apps[cellId];

      console.warn('One of the grid cells tried to render an entity that does not exist.', entityUuid);
      return;
    }

    const gmScreenSpecificSheetFlag = relevantDocument.getFlag(MODULE_ID, 'gmScreenSheetClass') as string | undefined;

    /* If there is an old app here which isn't this entity's, destroy it */
    if (this.apps[cellId] && this.apps[cellId]?.object.uuid !== entityUuid) {
      await this.apps[cellId].close();
      delete this.apps[cellId];
    }

    const sheet = relevantDocument.sheet;

    let sheetClass = sheet?.constructor;

    if (gmScreenSpecificSheetFlag && (relevantDocument instanceof Item || relevantDocument instanceof Actor)) {
      const gmScreenSpecificSheetConstructor =
        CONFIG[relevantDocument.documentName]?.sheetClasses?.[relevantDocument.type]?.[gmScreenSpecificSheetFlag]?.cls;
      sheetClass = gmScreenSpecificSheetConstructor ?? sheetClass;
    }

    /* If the currently cached sheet class does not match the sheet class, destroy it */
    if (this.apps[cellId] && this.apps[cellId].constructor.name !== sheetClass?.name) {
      await this.apps[cellId].close();
      delete this.apps[cellId];
    }

    /* If the currently cached sheet class does match the sheet class, return it */
    if (this.apps[cellId] && this.apps[cellId].constructor.name === sheetClass?.name) {
      log(false, `using cached application instance for "${relevantDocument.name}"`, {
        entityUuid,
        app: this.apps[cellId],
      });

      return this.apps[cellId];
    }

    log(false, 'relevantEntity sheet', {
      sheet,
      name: sheetClass?.name,
    });

    if (sheet instanceof JournalSheet && !sheet?.isKankaEntry) {
      log(false, `creating compact journal entry for "${relevantDocument.name}"`, {
        cellId,
      });

      this.apps[cellId] = new CompactJournalEntryDisplay(relevantDocument, { cellId, editable: false });
    } else if (sheet instanceof RollTableConfig) {
      log(false, `creating compact rollTableDisplay for "${relevantDocument.name}"`, {
        cellId,
      });

      this.apps[cellId] = new CompactRollTableDisplay(relevantDocument, { cellId });
    } else {
      log(false, `creating compact generic for "${relevantDocument.name}"`, {
        cellId,
      });

      //@ts-ignore
      const CompactDocumentSheet: ItemSheet | ActorSheet = new sheetClass(relevantDocument, {
        editable: false,
      });

      CompactDocumentSheet.options.editable = false;
      CompactDocumentSheet.options.popOut = false;
      //@ts-ignore
      CompactDocumentSheet.cellId = cellId;

      //@ts-ignore
      CompactDocumentSheet._injectHTML = function (html) {
        $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

        const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');

        log(false, 'CompactEntitySheet overwritten _injectHTML', {
          targetElement: gridCellContent,
          gridCellContent,
          cellId: this.cellId,
          html,
        });
        gridCellContent.append(html);
        this._element = html;
      };

      //@ts-ignore
      CompactDocumentSheet._replaceHTML = function (element, html, options) {
        $(this.cellId).find('.gm-screen-grid-cell-title').text(this.title);

        const gridCellContent = $(this.cellId).find('.gm-screen-grid-cell-content');
        gridCellContent.html(html);
        this._element = html;
      };

      log(false, `created compact generic for "${relevantDocument.name}"`, {
        sheet: CompactDocumentSheet,
      });

      this.apps[cellId] = CompactDocumentSheet;
    }

    return this.apps[cellId];
  }

  injectCellContents(html: JQuery<HTMLElement>) {
    $(html)
      .find('[data-entity-uuid]')
      .each((index, gridEntry) => {
        try {
          // `this` is the parent .gm-screen-grid-cell
          const relevantUuid = gridEntry.dataset.entityUuid;
          if (!relevantUuid) {
            return;
          }
          const cellId = `#${gridEntry.id}`;

          log(false, 'gridEntry with uuid defined found', { relevantUuid, cellId, gridEntry });

          this.getCellApplicationClass(relevantUuid, cellId)
            .then((application) => {
              log(false, `got application for "${cellId}"`, {
                application,
              });

              if (!application) {
                throw new Error('no application exists to render');
              }

              const classes = application.options.classes.join(' ');

              const gridCellContent = $(gridEntry).find('.gm-screen-grid-cell-content');
              gridCellContent.addClass(classes);

              application.render(true);
            })
            .catch((e) => {
              log(true, 'error trying to render a gridEntry', {
                gridEntry,
                cellId,
                relevantUuid,
                error: e,
              });
            });
        } catch (e) {
          log(false, 'erroring', e, {
            gridEntry,
          });
        }
      });

    // set some CSS Variables for child element use
    updateCSSPropertyVariable(html, '.gm-screen-grid-cell', 'width', '--this-cell-width');

    return html;
  }

  /**
   * All grids with entries hydrated with empty cells
   */
  getHydratedGrids() {
    log(false, 'getHydratedGrids', {
      userViewableGrids: this.userViewableGrids,
    });

    return Object.values(this.userViewableGrids).reduce<
      Record<string, { grid: GmScreenGrid; gridEntries: Partial<GmScreenGridEntry>[] }>
    >((acc, grid) => {
      const gridColumns = grid.columnOverride ?? this.columns;
      const gridRows = grid.rowOverride ?? this.rows;

      const emptyCellsNum = Number(gridColumns) * Number(gridRows) - GmScreenApplication.getNumOccupiedCells(grid);
      const emptyCells: Partial<GmScreenGridEntry>[] =
        emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

      acc[grid.id] = {
        grid,
        gridEntries: [...Object.values(grid.entries), ...emptyCells],
      };

      return acc;
    }, {});
  }

  /**
   * @override
   */
  getData() {
    const rightMargin = getGame().settings.get(MODULE_ID, MySettings.rightMargin);
    const drawerWidth = getGame().settings.get(MODULE_ID, MySettings.drawerWidth);
    const drawerHeight = getGame().settings.get(MODULE_ID, MySettings.drawerHeight);
    const drawerOpacity = getGame().settings.get(MODULE_ID, MySettings.drawerOpacity);
    const condensedButton = getGame().settings.get(MODULE_ID, MySettings.condensedButton);

    const newAppData = {
      ...super.getData(),
      grids: this.getHydratedGrids(),
      isGM: !!getGame().user?.isGM,
      condensedButton: condensedButton,
      data: this.data,
      columns: this.columns,
      rows: this.rows,
      drawerWidth,
      drawerHeight,
      rightMargin,
      drawerOpacity,
      expanded: this.expanded,
      hidden: !this.hasUserViewableGrids,
      displayDrawer: this.displayDrawer,
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

    const gmButtons = [
      {
        label: getGame().i18n.localize(`${MODULE_ABBREV}.gmScreen.Reset`),
        class: 'clear',
        icon: 'fas fa-ban',
        onclick: () => this.handleClear.bind(this)(),
      },
    ];

    return [
      ...(getGame().user?.isGM ? gmButtons : []),
      {
        label: getGame().i18n.localize(`${MODULE_ABBREV}.gmScreen.Refresh`),
        class: 'refresh',
        icon: 'fas fa-sync',
        onclick: () => this.refresh(),
      },
      ...superButtons,
    ];
  }

  /**
   * @override
   */
  async _onDrop(event) {
    event.stopPropagation();

    // do nothing if this user is not the gm
    if (!getGame().user?.isGM) return;

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
      closestGridCell: $(event.currentTarget).closest('.gm-screen-grid-cell'),
    });

    // only move forward if this is a JournalEntry or RollTable
    if (!['JournalEntry', 'RollTable', 'Item', 'Actor'].includes(data.type)) {
      return false;
    }

    const entityUuid = `${data.pack ? `Compendium.${data.pack}` : data.type}.${data.id}`;

    const gridElementPosition = getGridElementsPosition($(event.target).closest('.gm-screen-grid-cell'));
    const newEntryId = `${gridElementPosition.x}-${gridElementPosition.y}`;

    const newEntry: GmScreenGridEntry = {
      ...gridElementPosition,
      entryId: newEntryId,
      entityUuid,
    };

    this.addEntryToActiveGrid(newEntry);
  }

  /**
   * @override
   */
  async close(...args) {
    if (this.displayDrawer) {
      log(false, 'intercepting close');
      this.toggleGmScreenVisibility(false);

      return;
    }

    return super.close(...args);
  }
}
