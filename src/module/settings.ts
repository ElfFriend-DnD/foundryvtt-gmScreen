import { MODULE_ABBREV, MODULE_ID, MySettings } from './constants';
import { GmScreenConfig } from '../gridTypes';

const defaultGmScreenConfig: GmScreenConfig = {
  activeGridId: 'default',
  grids: {
    default: {
      name: 'Main',
      id: 'default',
      entries: {},
    },
  },
};

export const registerSettings = function () {
  // Debug use
  CONFIG[MODULE_ID] = { debug: false };
  // CONFIG.debug.hooks = true;

  game.settings.register(MODULE_ID, MySettings.gmScreenConfig, {
    name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Name`,
    default: defaultGmScreenConfig,
    type: Object,
    scope: 'world',
    config: false,
    hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.Hint`,
  });

  game.settings.register(MODULE_ID, MySettings.migrated, {
    config: false,
    default: { status: false, version: '1.2.2' },
    scope: 'world',
    type: Object,
  });

  game.settings.register(MODULE_ID, MySettings.displayDrawer, {
    name: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Name`,
    default: true,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: `${MODULE_ABBREV}.settings.${MySettings.displayDrawer}.Hint`,
    onChange: () => window.location.reload(),
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

  game.settings.register(MODULE_ID, MySettings.reset, {
    name: `${MODULE_ABBREV}.settings.${MySettings.reset}.Name`,
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: `${MODULE_ABBREV}.settings.${MySettings.reset}.Hint`,
    onChange: (selected) => {
      if (selected) {
        game.settings.set(MODULE_ID, MySettings.gmScreenConfig, defaultGmScreenConfig);
      }
    },
  });
};
