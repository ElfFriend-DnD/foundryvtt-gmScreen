import { GmScreenApi, GmScreenSettingsData, MyFlags, MyHooks, MySettings } from '../../types';
import { debouncedReload, log } from '../helpers';
import { GmScreenSettingsConfig } from './GmScreenSettingsConfig';
import { defaultGmScreenData, GmScreenDataManager } from './GmScreenData';
import { GmScreenApplicationCommon, GmScreenApplicationDrawer, GmScreenApplicationPopout } from './GmScreenApplication';
import { MODULE_ID, MODULE_ABBREV } from '../constants';

export class GmScreen {
  static _dataManager?: GmScreenDataManager;
  static _gmScreenApp?: GmScreenApplicationCommon;

  static TEMPLATES = {
    settings: `modules/${MODULE_ID}/templates/settings.hbs`,
    screen: `modules/${MODULE_ID}/templates/screen.hbs`,
    screenCell: `modules/${MODULE_ID}/templates/parts/screen-cell.hbs`,
    screenGrid: `modules/${MODULE_ID}/templates/parts/screen-grid.hbs`,
    compactRollTable: `modules/${MODULE_ID}/templates/parts/compact-roll-table.hbs`,
    compactJournalEntry: `modules/${MODULE_ID}/templates/parts/compact-journal-entry.hbs`,
    entitySheetInjection: `modules/${MODULE_ID}/templates/parts/entity-sheet-injection.hbs`,
    grids: {
      tableRow: `modules/${MODULE_ID}/templates/parts/settings-grid-config-table-row.hbs`,
    },
  };

  static HOOKS = MyHooks;

  static SETTINGS = MySettings;

  static FLAGS = MyFlags;

  /**
   * handle the init hook
   * Register all settings needed for GM Screen Initialization
   * */
  static init() {
    this.registerSettings();
    this.preloadTemplates();
  }

  /**
   * Handle Ready hook
   * Render the drawer mode screen
   * put the module api into the moduledata
   */
  static ready() {
    // Do anything once the module is ready
    if (this.dataManager.drawerMode) {
      log(false, 'readying', { drawerMode: this.dataManager.drawerMode, app: this.gmScreenApp });
      this.gmScreenApp.render(true);
    }

    const gmScreenModuleData = game.modules.get(MODULE_ID);

    if (gmScreenModuleData) {
      gmScreenModuleData.api = this.gmScreenApi;
    }

    if (game.user?.isGM) {
      game.settings.set(MODULE_ID, this.SETTINGS.reset, false);
    }
    Hooks.callAll(this.HOOKS.ready);
  }

  /**
   * Get or Create a new instance of GmScreenDataManager and cache it
   */
  static get dataManager() {
    if (!this._dataManager) {
      this._dataManager = new GmScreenDataManager();
    }

    return this._dataManager;
  }

  /**
   * Get or Create a new instance of GmScreenDataManager and cache it
   */
  static get gmScreenApp() {
    // TOOD: Is this the best play with a drawer-mode setting that can change?
    if (!this._gmScreenApp) {
      this._gmScreenApp = this.dataManager.drawerMode
        ? new GmScreenApplicationDrawer()
        : new GmScreenApplicationPopout();
    }

    return this._gmScreenApp;
  }

  /**
   * Get the public api for the gm screen
   */
  static get gmScreenApi(): GmScreenApi {
    return {
      toggleGmScreenVisibility: this.gmScreenApp.toggleGmScreenVisibility,
      refreshGmScreen: this.dataManager.refresh,
    };
  }

  /** Asynchronously preload templates */
  static async preloadTemplates() {
    return loadTemplates(Object.values(flattenObject(this.TEMPLATES)));
  }

  /** Register all settings needed for GM Screen Initialization */
  static registerSettings() {
    game.settings.registerMenu(MODULE_ID, 'menu', {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.gmScreenConfig}.Name`,
      label: `${MODULE_ABBREV}.settings.${this.SETTINGS.gmScreenConfig}.Label`,
      icon: 'fas fa-table',
      type: GmScreenSettingsConfig,
      restricted: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.gmScreenConfig}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.gmScreenConfig, {
      default: defaultGmScreenData,
      type: defaultGmScreenData.constructor as ConstructorOf<GmScreenSettingsData>,
      scope: 'world',
      config: false,
      onChange: () => {
        game.modules.get(MODULE_ID)?.api?.refreshGmScreen();
      },
    });

    game.settings.register(MODULE_ID, this.SETTINGS.migrated, {
      config: false,
      default: { status: false, version: '1.2.2' },
      scope: 'world',
      type: Object as unknown as ConstructorOf<{ status: boolean; version: string }>,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.columns, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.columns}.Name`,
      default: 4,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.columns}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.rows, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.rows}.Name`,
      default: 3,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.rows}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.displayDrawer, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.displayDrawer}.Name`,
      default: true,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.displayDrawer}.Hint`,
      onChange: debouncedReload,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.rightMargin, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.rightMargin}.Name`,
      default: 0,
      type: Number,
      scope: 'client',
      range: { min: 0, max: 75, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.rightMargin}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.drawerWidth, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerWidth}.Name`,
      default: 100,
      type: Number,
      scope: 'client',
      range: { min: 25, max: 100, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerWidth}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.drawerHeight, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerHeight}.Name`,
      default: 60,
      type: Number,
      scope: 'client',
      range: { min: 10, max: 90, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerHeight}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.drawerOpacity, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerOpacity}.Name`,
      default: 1,
      type: Number,
      scope: 'client',
      range: { min: 0.1, max: 1, step: 0.05 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.drawerOpacity}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.condensedButton, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.condensedButton}.Name`,
      default: false,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.condensedButton}.Hint`,
    });

    game.settings.register(MODULE_ID, this.SETTINGS.reset, {
      name: `${MODULE_ABBREV}.settings.${this.SETTINGS.reset}.Name`,
      default: false,
      type: Boolean,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${this.SETTINGS.reset}.Hint`,
      onChange: (selected) => {
        if (selected) {
          game.settings.set(MODULE_ID, this.SETTINGS.gmScreenConfig, defaultGmScreenData);
        }
      },
    });
  }
}
