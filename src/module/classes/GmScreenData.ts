import { JournalEntryData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';
import { GmScreenGrid, GmScreenGridEntry, GmScreenSettingsData, MyHooks, MySettings } from '../../types';
import { MODULE_ABBREV, MODULE_ID } from '../constants';
import { debouncedReload, log } from '../helpers';
import { GmScreen } from './GmScreen';
import { GmScreenSettingsConfig } from './GmScreenSettingsConfig';

export const defaultGmScreenData: GmScreenSettingsData = {
  activeGridId: 'default',
  grids: {
    default: {
      name: 'Main',
      id: 'default',
      isShared: false,
      entries: {},
    },
  },
};

/**
 * Handles getting and preparing the GM Screen data for the logged in user.
 * Refreshed via the `refresh` method, does not automatically keep up to date with settings.
 * Also provides some helper functions for setting grid-related data.
 *
 * Responsible for keeping track of the GM Screen Settings data changes to make refreshing the grid less resource heavy.
 */
export class GmScreenDataManager {
  /**
   * This class's current understanding of the GM Screen Data
   */
  _oldData?: GmScreenSettingsData;
  _data: GmScreenSettingsData;
  _gridOptions: {
    rows: number;
    columns: number;
  };

  constructor() {
    this._data = game.settings.get(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig);
    this._gridOptions = {
      rows: game.settings.get(MODULE_ID, GmScreen.SETTINGS.rows),
      columns: game.settings.get(MODULE_ID, GmScreen.SETTINGS.columns),
    };
  }

  /**
   * Cached copy of the previous grid data from settings
   * used to tell the diff
   */
  // static _oldGmScreenConfig: GmScreenSettingsData;

  get gmScreenSettingsConfigData() {
    return {
      settings: this._data,
      defaultRows: this._gridOptions.rows,
      defaultColumns: this._gridOptions.columns,
    };
  }

  // static get _defaultColumns() {
  //   return game.settings.get(MODULE_ID, GmScreen.SETTINGS.columns);
  // }

  // static get _defaultRows() {
  //   return game.settings.get(MODULE_ID, GmScreen.SETTINGS.rows);
  // }

  /** Filters grids to ones the logged in user can see */
  get grids() {
    return GmScreenDataManager.getUserVisibleGridsFromSettingsData(this._data);
  }

  /** Only matters to the GM */
  get activeGmGridId() {
    return this._data?.activeGridId ?? defaultGmScreenData.activeGridId;
  }

  /**
   * Helper to return the grid currently marked active
   * Only matters for GMs
   */
  get activeGmGrid() {
    return this.grids[this.activeGmGridId];
  }

  /**
   * @returns `true` if the user has any visible grids
   */
  get hasUserViewableGrids() {
    return !!Object.keys(this.grids).length;
  }

  /**
   * @returns `true` if the user wants to use drawer mode
   */
  get drawerMode() {
    return game.settings.get(MODULE_ID, GmScreen.SETTINGS.displayDrawer);
  }

  /**
   * A helper to aggregate a few settings useful for displaying the GM Screen Application
   */
  get applicationData() {
    const { SETTINGS } = GmScreen;
    return {
      ...this._gridOptions,
      rightMargin: game.settings.get(MODULE_ID, SETTINGS.rightMargin),
      drawerWidth: game.settings.get(MODULE_ID, SETTINGS.drawerWidth),
      drawerHeight: game.settings.get(MODULE_ID, SETTINGS.drawerHeight),
      drawerOpacity: game.settings.get(MODULE_ID, SETTINGS.drawerOpacity),
      condensedButton: game.settings.get(MODULE_ID, SETTINGS.condensedButton),
      displayDrawer: game.settings.get(MODULE_ID, SETTINGS.displayDrawer),
    };
  }

  /**
   * Gets the gridIds that were most recently updated
   * @returns the grid ids that have changed recently
   */
  get diffGridIds() {
    if (!this._oldData?.grids) {
      return Object.keys(this._data.grids);
    }

    return Object.keys(foundry.utils.diffObject(this._oldData.grids, this._data.grids));
  }

  /**
   * Checks if there are any newly visible or invisible grids to this user
   * @returns true if the grids visible to this user have changed
   */
  get visibleGridIdsChanged() {
    const userVisibleGridIds = new Set(Object.keys(this.grids));

    // if there was no old data, all grids are new
    if (!this._oldData) {
      return true;
    }

    const oldUserVisibleGridIds = new Set(
      Object.keys(GmScreenDataManager.getUserVisibleGridsFromSettingsData(this._oldData)),
    );

    return !userVisibleGridIds.equals(oldUserVisibleGridIds);
  }

  /**
   * Populate this instance with the data from settings.
   * Runs from the Settings registered `onChange`
   * Re-renders the grid if necessary
   * // should be `refreshGmScreen` from the api
   */
  refresh = () => {
    this._oldData = foundry.utils.deepClone(this._data);

    this._data = game.settings.get(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig);
    this._gridOptions = {
      rows: game.settings.get(MODULE_ID, GmScreen.SETTINGS.rows),
      columns: game.settings.get(MODULE_ID, GmScreen.SETTINGS.columns),
    };

    log(false, 'refreshing gm screen data', {
      newData: foundry.utils.deepClone(this._data),
      data: foundry.utils.deepClone(this._oldData),
      diffGridIds: this.diffGridIds,
    });

    // do nothing if there are no grid ids that changed
    if (!this.diffGridIds) {
      return;
    }

    // 1. see if the grids I can see are the ones that changed
    // if this is true we need to rerender
    const myGridsChanged = this.diffGridIds.filter((diffGridId) => Object.keys(this.grids).includes(diffGridId));

    // 2. check if the gridIds I can currently see are the same as before the diff
    // if this is true we need to rerender
    const myVisibleGridIdsChanged = this.visibleGridIdsChanged;

    // if both are false, don't re-render
    if (!myVisibleGridIdsChanged && !myGridsChanged) {
      log(false, 'not rerendering because none of my visible grids changed');
      return;
    }

    // TODO: Re-render GM Screen Application?
    // provides diffGridIds
    GmScreen.gmScreenApp.refresh();
  };

  /**
   * Overrides the existing Grid object in settings with the provided object
   *
   * Refreshes automatically on all clients because of the `onChange` callback on the setting registration
   */
  setGridData(newGridData: GmScreenGrid) {
    if (!game.user?.isGM) {
      throw new Error('You must be a GM user to edit a Grid');
    }

    const newGmScreenConfig = foundry.utils.deepClone(this._data);

    const updated = setProperty(newGmScreenConfig, `grids.${newGridData.id}`, newGridData);

    if (!updated) {
      // something failed
      throw new Error('Something went wrong trying to update the grid data.');
    }

    log(false, 'setGridData', {
      currentConfig: this._data,
      newGmScreenConfig,
      updated,
    });

    // changing this setting will auto-refresh the screen
    return game.settings.set(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig, newGmScreenConfig);
  }

  /**
   * Sets the active GM Grid ID (i.e. the one we expect the GM to be looking at)
   */
  async setActiveGmGridId(newActiveGridId?: string) {
    if (!game.user?.isGM || newActiveGridId === this.activeGmGridId || !newActiveGridId) {
      return;
    }

    log(false, 'trying to set active grid', { newActiveGridId });

    try {
      const newGmScreenConfig = foundry.utils.deepClone(this._data);
      newGmScreenConfig.activeGridId = newActiveGridId;
      await game.settings.set(MODULE_ID, GmScreen.SETTINGS.gmScreenConfig, newGmScreenConfig);
    } catch (error) {
      log(true, 'error setting active tab', error);
    }
  }

  /**
   * Gets the grid entries for a given grid as an array with empty cells populated
   */
  getHydratedGridEntries(grid: GmScreenGrid) {
    const gridColumns = grid.columnOverride ?? this._gridOptions.columns;
    const gridRows = grid.rowOverride ?? this._gridOptions.rows;

    const emptyCellsNum = Number(gridColumns) * Number(gridRows) - GmScreenDataManager.getNumOccupiedCells(grid);
    const emptyCells: Partial<GmScreenGridEntry>[] =
      emptyCellsNum > 0 ? [...new Array(emptyCellsNum)].map(() => ({})) : [];

    return [...Object.values(grid.entries), ...emptyCells];
  }

  /**
   * Adds a new entry to the currently active grid
   */
  addEntryToActiveGrid(newEntry: GmScreenGridEntry) {
    if (!game.user?.isGM) {
      throw new Error('You must be a GM user to edit a Grid');
    }

    const newEntries = { ...this.activeGmGrid.entries };

    newEntries[newEntry.entryId] = {
      ...newEntries[newEntry.entryId],
      ...newEntry,
    };

    const newGridData: GmScreenGrid = {
      ...this.activeGmGrid,
      entries: newEntries,
    };

    log(false, 'addEntryToActiveGrid', {
      activeGmGridData: this.activeGmGrid,
      newEntries,
      newEntry,
      newGridData,
    });

    return this.setGridData(newGridData);
  }

  /**
   * Remove a given entry from the Active Grid
   * @param {string} entryId - entry to remove from the active grid's entries
   */
  removeEntryFromActiveGrid(entryId: string) {
    const clearedCell = foundry.utils.deepClone(this.activeGmGrid.entries[entryId]);
    const shouldKeepCellLayout = clearedCell.spanCols || clearedCell.spanRows;

    const newEntries = {
      ...this.activeGmGrid.entries,
    };

    if (shouldKeepCellLayout) {
      delete clearedCell.entityUuid;
      newEntries[entryId] = clearedCell;
    } else {
      delete newEntries[entryId];
    }

    const newGridData: GmScreenGrid = {
      ...this.activeGmGrid,
      entries: newEntries,
    };

    // TODO: This needs to close the open entry applications(?)
    return this.setGridData(newGridData);
  }

  /**
   * Handles any cell overlap problems that new grid entry data might introduce
   */
  editCellInActiveGrid(gridEntry: GmScreenGridEntry) {
    const newEntries = {
      ...this.activeGmGrid.entries,
      [gridEntry.entryId]: gridEntry,
    };

    // based on the X, Y, and Span values of `newCell` find all problematic entryIds
    // BRITTLE if entryId's formula changes
    const problemCoordinates = [...Array(gridEntry.spanCols).keys()]
      .map((_, index) => {
        const problemX = gridEntry.x + index;

        return [...Array(gridEntry.spanRows).keys()].map((_, index) => {
          const problemY = gridEntry.y + index;
          return `${problemX}-${problemY}`; // problem cell's id
        });
      })
      .flat();

    log(false, {
      problemCoordinates,
    });

    // get any overlapped cells and remove them
    Object.values(newEntries).forEach((entry) => {
      if (problemCoordinates.includes(entry.entryId) && entry.entryId !== gridEntry.entryId) {
        delete newEntries[entry.entryId];
      }
    });

    log(false, 'newEntries', newEntries);

    const newGridData = {
      ...this.activeGmGrid,
      entries: newEntries,
    };

    return this.setGridData(newGridData);
  }

  /**
   * Double confirms Clearing the Active Grid
   */
  clearActiveGrid = () => {
    log(false, 'clearActiveGrid');

    return Dialog.confirm({
      title: game.i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Title`),
      content: game.i18n.localize(`${MODULE_ABBREV}.warnings.clearConfirm.Content`),
      yes: async () => {
        return this.setGridData({
          ...this.activeGmGrid,
          entries: {},
        });
      },
    });
  };

  /***********************/
  /**  STATIC HELPERS  ***/
  /***********************/

  /**
   * Given the set of settings data, return only the grids visible to this user
   */
  static getUserVisibleGridsFromSettingsData({ grids }: GmScreenSettingsData) {
    if (!game.user) {
      return {};
    }

    if (game.user?.isGM) {
      return grids;
    }

    return Object.fromEntries(Object.entries(grids).filter(([_gridId, gridData]) => gridData.isShared));
  }

  /** Calulates how many cells are occupied for a given grid */
  static getNumOccupiedCells(grid: GmScreenGrid) {
    return Object.values(grid.entries).reduce((acc, entry) => {
      const cellsTaken = (entry.spanCols || 1) * (entry.spanRows || 1);
      return acc + cellsTaken;
    }, 0);
  }

  /**
   * Utility method to help typescript understand that these are only
   * actors, items, journals, or rolltables
   *
   * @param entityUuid - relevant entityUuid
   */
  static async getRelevantGmScreenDocument(entityUuid: string) {
    const relevantDocument = await fromUuid(entityUuid);

    if (
      !(
        relevantDocument instanceof Actor ||
        relevantDocument instanceof Item ||
        relevantDocument instanceof JournalEntry ||
        relevantDocument instanceof JournalEntryPage ||
        relevantDocument instanceof RollTable
      )
    ) {
      return;
    }

    return relevantDocument;
  }
}
