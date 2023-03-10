import { GmScreenGridEntry } from '../../types';
import { MODULE_ABBREV, MODULE_ID } from '../constants';
import { log, updateCSSPropertyVariable } from '../helpers';
import { GmScreenCell } from './GmScreenCell';
import { GmScreen } from './GmScreen';
import { GmScreenDataManager } from './GmScreenData';
import { GmScreenSettingsConfig } from './GmScreenSettingsConfig';
import { CompactRollTableDisplay } from './DocumentSheets/CompactRollTableSheet';

enum ClickAction {
  'clearGrid' = 'clearGrid',
  'refresh' = 'refresh',
  'clearCell' = 'clearCell',
  'configureCell' = 'configureCell',
  'open' = 'open',
  'toggle-gm-screen' = 'toggle-gm-screen',
  'setActiveGridId' = 'setActiveGridId',
  'rolltable' = 'rolltable',
  'rolltable-reset' = 'rolltable-reset',
}

type GmScreenApp = ActorSheet | ItemSheet | JournalSheet | RollTableConfig;

/**
 * @abstract
 */
export class GmScreenApplicationCommon extends Application {
  /** Cache of applications rendered within this gm screen */
  apps: Record<string, GmScreenApp>;
  draggedTab: HTMLElement | undefined;

  constructor(options = {}) {
    super(options);
    this.apps = {};
  }

  /** Configures the ScrollY, GM Drag/Drop, and Tabs for all use cases */
  static get defaultOptions(): ApplicationOptions {
    const {
      grids,
      activeGmGridId,
      applicationData: { columns, rows },
    } = GmScreen.dataManager;

    // set all of the cells of all the grids to be scrollY managed
    const scrollY = Object.keys(grids).reduce((acc, gridKey) => {
      const gridColumns = grids[gridKey].columnOverride ?? columns;
      const gridRows = grids[gridKey].rowOverride ?? rows;

      const totalCells = Number(gridColumns) * Number(gridRows);

      const gridKeyScrollY = [...new Array(totalCells)].map(
        (_, index) => `#gm-screen-${gridKey}-cell-${index} .gm-screen-grid-cell-content`,
      );
      return acc.concat(gridKeyScrollY);
    }, [] as string[]);

    return {
      ...super.defaultOptions,
      ...(game.user?.isGM
        ? {
            dragDrop: [{ dropSelector: '.gm-screen-grid-cell' }],
          }
        : undefined),
      tabs: [
        {
          navSelector: '.gm-screen-tabs',
          contentSelector: '.gm-screen-app',
          initial: activeGmGridId,
        },
      ],
      template: GmScreen.TEMPLATES.screen,
      id: 'gm-screen-app',
      scrollY,
    };
  }

  /**
   * This currently thinly wraps `this.render`, but might be more complicated in the future.
   */
  refresh() {
    this.render();
  }

  /**
   * Hydrates all visible grids with empty cells in the format the handlebars files wants to display
   */
  get hydratedGridEntries() {
    const grids = GmScreen.dataManager.grids;

    return Object.fromEntries(
      Object.entries(grids).map(([gridId, gridData]) => {
        return [
          gridId,
          {
            ...gridData,
            gridEntries: GmScreen.dataManager.getHydratedGridEntries(gridData),
          },
        ];
      }),
    );
  }

  /**
   * @override
   */
  getData() {
    const { applicationData, hasUserViewableGrids } = GmScreen.dataManager;

    const newAppData = {
      ...super.getData(),
      ...applicationData,
      grids: this.hydratedGridEntries,
      isGM: !!game.user?.isGM,
      hidden: !hasUserViewableGrids,
      drawerMode: GmScreen.dataManager.drawerMode,
    };

    log(false, 'getData', {
      newAppData,
    });

    return newAppData;
  }

  /**
   * Handles actually rendering the application, we want to inject our cells
   * at the end of this method
   * @override
   */
  async _render(...args: any[]) {
    const promise = await super._render(...args);

    // stop here if there's no user-viewable grids
    if (!GmScreen.dataManager.hasUserViewableGrids) {
      return promise;
    }

    const html = this.element;
    // add our cell contents to the template now that our application is done rendering
    this.injectCellContents(html);

    // update a few attributes in the rendered html
    const vanillaGridElement = document.querySelector('.gm-screen-grid');
    if (!vanillaGridElement) {
      return;
    }
    const vanillaGridElementStyles = getComputedStyle(vanillaGridElement);
    const cols = vanillaGridElementStyles.gridTemplateColumns.split(' ');
    const colWidth = cols[0];

    $(html)
      .find('.gm-screen-grid')
      .each((i, gridElement) => {
        gridElement.style.setProperty('--grid-cell-width', colWidth);
      });

    // enforce calculated width per cell. this requires a refresh after window dimension changes, though
    const numericColWidth: number = +colWidth.replace('px', '');
    $(html)
      .find('.gm-screen-grid-cell')
      .each((i, gridElement) => {
        const columnSpanCount: number = +gridElement.style.getPropertyValue('--column-span-count');
        const gridElementWidth = numericColWidth * columnSpanCount;
        gridElement.style.setProperty('width', gridElementWidth.toString() + 'px');
      });

    return promise;
  }

  /**
   * @override
   */
  activateListeners(html: JQuery<HTMLElement>) {
    super.activateListeners(html);

    if (game.user?.isGM) {
      this._reorderDragDropListeners(html);
    }

    $('.gm-screen-button').on('contextmenu', () => {
      const config = new GmScreenSettingsConfig();
      config.render(true);
    });

    $(html).on('click', 'button', this.handleClickEvent.bind(this));
    $(html).on('click', 'a', this.handleClickEvent.bind(this));
  }

  /**
   * Handles the ability to re-order tabs if the user is the GM
   */
  _reorderDragDropListeners(html: JQuery<any>) {
    let draggedTab: HTMLElement | undefined;
    const tabElement = html.find('.gm-screen-tabs');

    tabElement.on('dragstart', '.item', (e) => {
      draggedTab = e.target;
    });

    tabElement.on('dragover', (e) => {
      if (!draggedTab) {
        return;
      }

      const children = Array.from($(e.target).closest('.gm-screen-tabs').children());

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

      const newGrids = foundry.utils.deepClone(GmScreen.dataManager.grids);

      // rebuild gmScreenConfig based on the current layout of the tabs
      $(e.target)
        .closest('.gm-screen-tabs')
        .children()
        .each((index, item) => {
          const gridId = $(item).attr('data-tab');
          if (!gridId) {
            return;
          }
          newGrids[gridId] = GmScreen.dataManager.grids[gridId];
        });

      draggedTab = undefined;
      await game.settings.set(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig, {
        activeGridId: GmScreen.dataManager.activeGmGridId,
        grids: newGrids,
      });
    });
  }

  /**
   * Handles Common Mouse Events for all types of gm screen
   */
  async handleClickEvent(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    e.preventDefault();

    const action = e.currentTarget.dataset.action as ClickAction;
    const entityUuid: string | undefined = $(e.currentTarget).parents('[data-entity-uuid]')?.data()?.entityUuid;
    const entryId: string | undefined = $(e.currentTarget).parents('[data-entry-id]')?.data()?.entryId;

    log(false, 'handleClickEvent', {
      e,
      action,
    });

    switch (action) {
      case ClickAction.clearCell: {
        if (!entryId) {
          return;
        }

        GmScreen.dataManager.removeEntryFromActiveGrid(entryId);
        break;
      }
      case ClickAction.configureCell: {
        const coordinates = GmScreenApplicationCommon.getGridElementsPosition($(e.target).parent());
        GmScreenCell._onConfigureGridEntry(coordinates, entryId);
        break;
      }
      case ClickAction.open: {
        GmScreenCell._onClickOpen(entityUuid);
        break;
      }
      case ClickAction.setActiveGridId: {
        const newActiveGridId = e.currentTarget.dataset.tab;
        await GmScreen.dataManager.setActiveGmGridId(newActiveGridId);
        // this.refresh();
        break;
      }
      case ClickAction.rolltable: {
        if (!entityUuid || !entryId) {
          break;
        }
        const cellClassInstance = (await this.getCellApplicationClass(entityUuid, entryId)) as CompactRollTableDisplay;
        await cellClassInstance._rollOnTable();
      }
    }
  }

  /**
   * @override
   */
  _canDragDrop(): boolean {
    return !!game.user?.isGM;
  }

  /**
   * Handles the dropping of a document onto a grid cell
   * @override
   */
  _onDrop(event: DragEvent): void {
    event.stopPropagation();

    // do nothing if this user is not the gm
    if (!game.user?.isGM) return;

    // type safety checks
    if (!event.currentTarget || !event.target || !event.dataTransfer) return;

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
    } catch (err) {
      return;
    }

    log(false, 'onDrop', {
      event,
      data,
      closestGridCell: $(event.currentTarget).closest('.gm-screen-grid-cell'),
    });

    // only move forward if dropped entry is of a supported type
    if (!['JournalEntry', 'JournalEntryPage', 'RollTable', 'Item', 'Actor'].includes(data.type)) {
      return;
    }

    const entityUuid = data.uuid;

    const gridElementPosition = GmScreenApplicationCommon.getGridElementsPosition(
      $(event.target).closest('.gm-screen-grid-cell'),
    );
    const newEntryId = `${gridElementPosition.x}-${gridElementPosition.y}`;

    const newEntry: GmScreenGridEntry = {
      ...gridElementPosition,
      entryId: newEntryId,
      entityUuid,
    };

    GmScreen.dataManager.addEntryToActiveGrid(newEntry);
  }

  /**
   * Injects cell applications during _renderInner;
   * Handles finding all cells in the html and injecting their rightful contents based on
   * data attributes which detail the uuid of the document within
   */
  injectCellContents(html: JQuery<HTMLElement>) {
    const allCells = $(html).find('[data-entity-uuid]');

    log(false, 'injectCellContents', allCells);

    allCells.each((index, gridEntry) => {
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

            // actually render the application
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

    updateCSSPropertyVariable(html, '.gm-screen-grid-cell', 'width', '--this-cell-width');

    return html;
  }

  /**
   * create and cache the custom Application when we need to during GmScreenApplication.render();
   * and then use that cached Application instance to render
   *
   * @param documentUuid - Identifier for the Entity in the cell
   * @param cellId - Identifier for the Cell
   * @param gridCellContentElement - the element to inject into
   * @returns the instance of the document's sheet to render
   */
  async getCellApplicationClass(documentUuid: string, cellId: string) {
    const relevantDocument = await GmScreenDataManager.getRelevantGmScreenDocument(documentUuid);

    // if the document does not exist, 'close' the application and destroy the cached copy
    if (!relevantDocument) {
      await this.apps[cellId]?.close();
      delete this.apps[cellId];

      console.warn(
        'One of the grid cells tried to render a document that does not exist. Perhaps it was deleted or is in a compendium module that is not active?',
        documentUuid,
      );
      return;
    }

    /* If there is an old app in this cell which does not belong to this document, 'close' that application and destroy its cache entry */
    if (this.apps[cellId] && this.apps[cellId]?.object.uuid !== documentUuid) {
      await this.apps[cellId].close();
      delete this.apps[cellId];
    }

    // gets the relevant document's GM Screen Sheet class constructor based on any present overrides
    const SheetClassConstructor = (GmScreenCell._getGridEntrySheetClass(relevantDocument) ??
      relevantDocument.sheet?.constructor) as ConstructorOf<DocumentSheet> | undefined;

    /* If the currently cached application does not match the sheet class, 'close' that application and destroy its cache entry */
    if (this.apps[cellId] && this.apps[cellId].constructor.name !== SheetClassConstructor?.name) {
      await this.apps[cellId].close();
      delete this.apps[cellId];
    }

    /* If the currently cached application does match the expected sheet class, return it */
    if (this.apps[cellId] && this.apps[cellId].constructor.name === SheetClassConstructor?.name) {
      log(false, `using cached application instance for "${relevantDocument.name}"`, {
        entityUuid: documentUuid,
        app: this.apps[cellId],
      });

      return this.apps[cellId];
    }

    /** Otherwise, we need to make a new instance of the sheet class retrieved */
    log(false, 'relevantEntity sheet', {
      sheetClassConstructor: SheetClassConstructor,
      name: SheetClassConstructor?.name,
    });

    if (!SheetClassConstructor) {
      throw new Error('Could not create cell application as the constructor does not exist');
    }

    // // TODO: FIXME in _getGmScreenSheetClass
    // if (SheetClassConstructor.name === 'RollTableConfig') {
    //   log(false, `creating compact rollTableDisplay for "${relevantDocument.name}"`, {
    //     cellId,
    //   });

    //   this.apps[cellId] = new CompactRollTableDisplay(relevantDocument, { cellId });
    //   return this.apps[cellId];
    // }

    log(false, `creating compact generic for "${relevantDocument.name}"`, {
      cellId,
    });

    const CompactDocumentSheet = new SheetClassConstructor(relevantDocument, {
      editable: false,
    }) as GmScreenApp;

    // apply all the right overrides to the sheet class so it renders inside the grid
    GmScreenCell.applyGmScreenCellSheetOverrides(CompactDocumentSheet, cellId);

    log(false, `created compact generic for "${relevantDocument.name}"`, {
      sheet: CompactDocumentSheet,
    });

    this.apps[cellId] = CompactDocumentSheet;

    return this.apps[cellId];
  }

  toggleGmScreenVisibility() {
    throw new Error('Each GM Screen subclass must implemement this method');
  }

  /**
   * Gets the given element's X/Y coordinates in the grid
   */
  static getGridElementsPosition(element: JQuery<any>) {
    const relevantGridElement = element.parents('.gm-screen-grid')[0];

    const vanillaGridElementStyles = window.getComputedStyle(relevantGridElement);

    log(false, 'getGridElementsPosition', {
      element,
      relevantGridElement,
      vanillaGridElementStyles,
      gap: vanillaGridElementStyles.gap, // wtf this is '' in firefox
      gridRowGap: vanillaGridElementStyles.rowGap,
      gridColGap: vanillaGridElementStyles.columnGap,
    });

    const numberRegex = /([+-]?(?=\.\d|\d)(?:\d+)?(?:\.?\d*))(?:[eE]([+-]?\d+))?/;
    const gap = Number(vanillaGridElementStyles.rowGap.match(numberRegex)?.[0]);

    //Get the css attribute grid-template-columns from the css of class grid
    //split on whitespace and get the length, this will give you the column dimensions
    const cols = vanillaGridElementStyles.gridTemplateColumns.split(' ');
    const colWidth = Number(cols[0].match(numberRegex)?.[0]);

    //Get the css attribute grid-template-rows from the css of class grid
    //split on whitespace and get the length, this will give you the column dimensions
    const rows = vanillaGridElementStyles.gridTemplateRows.split(' ');
    const rowHeight = Number(rows[0].match(numberRegex)?.[0]);

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
}

/** Extends the base GM Screen Application for the Popout Case */
export class GmScreenApplicationPopout extends GmScreenApplicationCommon {
  static get defaultOptions(): ApplicationOptions {
    const { columns, rows } = GmScreen.dataManager.applicationData;

    return {
      ...super.defaultOptions,
      classes: ['gm-screen-popOut'],
      popOut: true,
      width: Number(columns) * 400,
      height: Number(rows) * 300,
      resizable: true,
      title: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Title`),
    };
  }

  /** Handle toggling gm screens */
  toggleGmScreenVisibility(shouldOpen = !this.rendered) {
    if (shouldOpen) {
      if (!this.rendered) {
        this.render(true);
      } else {
        this.bringToTop();
      }
    }

    if (!shouldOpen) {
      this.close();
    }

    // on open, call MyHooks.openClose with isOpen: true and the active grid details
    Hooks.callAll(GmScreen.HOOKS.openClose, this, {
      isOpen: this.rendered,
      activeGridId: GmScreen.dataManager.activeGmGridId,
      activeGridName: GmScreen.dataManager.activeGmGrid?.name,
    });
  }

  /**
   * @override
   */
  _getHeaderButtons() {
    const superButtons = super._getHeaderButtons();

    const gmButtons = [
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Reset`),
        class: 'clear',
        icon: 'fas fa-ban',
        onclick: () => GmScreen.dataManager.clearActiveGrid(), // TODO: `this.apps = {};` ?
      },
    ];

    return [
      ...(game.user?.isGM ? gmButtons : []),
      {
        label: game.i18n.localize(`${MODULE_ABBREV}.gmScreen.Refresh`),
        class: 'refresh',
        icon: 'fas fa-sync',
        onclick: () => GmScreen.dataManager.refresh.bind(this)(),
      },
      ...superButtons,
    ];
  }
}

/** Extends the base GM Screen Application for the Drawer Case */
export class GmScreenApplicationDrawer extends GmScreenApplicationCommon {
  expanded = false;

  static get defaultOptions(): ApplicationOptions {
    return {
      ...super.defaultOptions,
      popOut: false,
    };
  }

  getData() {
    return {
      ...super.getData(),
      expanded: this.expanded,
    };
  }

  // TODO ??? Still needed ???
  activateListeners(html: any): void {
    super.activateListeners(html);

    // bring to top on click
    $(html).on('mousedown', (event) => {
      log(false, 'buttons', event.buttons);
      if (event.buttons === 2) {
        return;
      }
      this.bringToTop();
    });
  }

  /**
   * Set the GM Screen Visibility. By default will toggle the current state.
   * @param {boolean} expanded
   */
  toggleGmScreenVisibility(expanded = !this.expanded) {
    // TODO: Allow toggling open to a specific tab
    // TODO: Provide API for other modules to know what tabs exist
    this.expanded = expanded;

    const activeGridDetails = {
      activeGridId: GmScreen.dataManager.activeGmGridId,
      activeGridName: GmScreen.dataManager.activeGmGrid?.name,
    };

    if (this.expanded) {
      ui.windows[this.appId] = this; // add our window to the stack, pretending we are an open Application

      this.bringToTop();

      $('.gm-screen-app').addClass('expanded');

      // on open, call MyHooks.openClose with isOpen: true and the active grid details
      Hooks.callAll(GmScreen.HOOKS.openClose, this, {
        isOpen: true,
        ...activeGridDetails,
      });
    } else {
      $('.gm-screen-app').removeClass('expanded');
      delete ui.windows[this.appId]; // remove our window to the stack, pretending we are a closed Application

      // on open, call MyHooks.openClose with isOpen: false and the active grid details
      Hooks.callAll(GmScreen.HOOKS.openClose, this, {
        isOpen: false,
        ...activeGridDetails,
      });
    }
  }

  async handleClickEvent(e: JQuery.ClickEvent<HTMLElement, undefined, HTMLElement, HTMLElement>) {
    super.handleClickEvent(e);

    const action = e.currentTarget.dataset.action as ClickAction;
    switch (action) {
      case ClickAction.clearGrid: {
        GmScreen.dataManager.clearActiveGrid();
        break;
      }
      case ClickAction.refresh: {
        GmScreen.dataManager.refresh();
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
    }
  }
}
