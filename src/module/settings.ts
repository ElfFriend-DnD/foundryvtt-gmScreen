import { MODULE_ABBREV, MODULE_ID, MySettings } from './constants';
import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from '../gridTypes';

const defaultGmScreenConfig: GmScreenConfig = {
  grid: {
    entries: [],
  },
};

export const registerSettings = function () {
  CONFIG[MODULE_ID] = { debug: true };
  CONFIG.debug.hooks = true;

  game.settings.register(MODULE_ID, MySettings.gmScreenConfig, {
    name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.name`,
    default: defaultGmScreenConfig,
    type: Object,
    scope: 'world',
    config: false,
    hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.label`,
  });

  game.settings.register(MODULE_ID, MySettings.columns, {
    name: `${MODULE_ABBREV}.settings.${MySettings.columns}.Name`,
    default: 4,
    type: Number,
    scope: 'world',
    config: true,
    hint: `${MODULE_ABBREV}.settings.${MySettings.columns}.Label`,
  });

  game.settings.register(MODULE_ID, MySettings.rows, {
    name: `${MODULE_ABBREV}.settings.${MySettings.rows}.Name`,
    default: 3,
    type: Number,
    scope: 'world',
    config: true,
    hint: `${MODULE_ABBREV}.settings.${MySettings.rows}.Label`,
  });

  game.settings.register(MODULE_ID, MySettings.reset, {
    name: `${MODULE_ABBREV}.settings.${MySettings.reset}.Name`,
    default: false,
    type: Boolean,
    scope: 'world',
    config: true,
    hint: `${MODULE_ABBREV}.settings.${MySettings.reset}.Label`,
    onChange: (e, selected) => {
      if (selected) {
        game.settings.set(MODULE_ID, MySettings.gmScreenConfig, {
          grid: {
            entries: [],
          },
        });
      }
    },
  });
};
