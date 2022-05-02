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

  // unsure if needed
  static HOOKS = MyHooks;

  // unsure if needed
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
      gmScreenModuleData.api = {
        toggleGmScreenVisibility: this.gmScreenApp.toggleGmScreenVisibility,
        refreshGmScreen: this.dataManager.refresh,
      } as GmScreenApi;
    }

    if (game.user?.isGM) {
      game.settings.set(MODULE_ID, MySettings.reset, false);
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

  /** Asynchronously preload templates */
  static async preloadTemplates() {
    return loadTemplates(Object.values(flattenObject(this.TEMPLATES)));
  }

  /** Register all settings needed for GM Screen Initialization */
  static registerSettings() {
    game.settings.registerMenu(MODULE_ID, 'menu', {
      name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Name`,
      label: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Label`,
      icon: 'fas fa-table',
      type: GmScreenSettingsConfig,
      restricted: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.gmScreenConfig, {
      default: defaultGmScreenData,
      type: defaultGmScreenData.constructor as ConstructorOf<GmScreenSettingsData>,
      scope: 'world',
      config: false,
      onChange: () => {
        game.modules.get(MODULE_ID)?.api?.refreshGmScreen();
      },
    });

    game.settings.register(MODULE_ID, MySettings.migrated, {
      config: false,
      default: { status: false, version: '1.2.2' },
      scope: 'world',
      type: Object as unknown as ConstructorOf<{ status: boolean; version: string }>,
    });

    game.settings.register(MODULE_ID, MySettings.columns, {
      name: `${MODULE_ABBREV}.settings.${MySettings.columns}.Name`,
      default: 4,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.columns}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.rows, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rows}.Name`,
      default: 3,
      type: Number,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rows}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.displayDrawer, {
      name: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Name`,
      default: true,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Hint`,
      onChange: debouncedReload,
    });

    game.settings.register(MODULE_ID, MySettings.rightMargin, {
      name: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Name`,
      default: 0,
      type: Number,
      scope: 'client',
      range: { min: 0, max: 75, step: 5 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.rightMargin}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerWidth, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Name`,
      default: 100,
      type: Number,
      scope: 'client',
      range: { min: 25, max: 100, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerWidth}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerHeight, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Name`,
      default: 60,
      type: Number,
      scope: 'client',
      range: { min: 10, max: 90, step: 1 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerHeight}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.drawerOpacity, {
      name: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Name`,
      default: 1,
      type: Number,
      scope: 'client',
      range: { min: 0.1, max: 1, step: 0.05 },
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.drawerOpacity}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.condensedButton, {
      name: `${MODULE_ABBREV}.settings.${MySettings.condensedButton}.Name`,
      default: false,
      type: Boolean,
      scope: 'client',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.condensedButton}.Hint`,
    });

    game.settings.register(MODULE_ID, MySettings.reset, {
      name: `${MODULE_ABBREV}.settings.${MySettings.reset}.Name`,
      default: false,
      type: Boolean,
      scope: 'world',
      config: true,
      hint: `${MODULE_ABBREV}.settings.${MySettings.reset}.Hint`,
      onChange: (selected) => {
        if (selected) {
          game.settings.set(MODULE_ID, MySettings.gmScreenConfig, defaultGmScreenData);
        }
      },
    });
  }
}
