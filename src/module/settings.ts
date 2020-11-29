import { MODULE_ABBREV, MODULE_ID, MySettings } from './constants';
import { GmScreenConfig, GmScreenGrid, GmScreenGridEntry } from '../gridTypes';

const defaultGmScreenConfig: GmScreenConfig = {
  grid: {
    columns: 4,
    rows: 3,
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
};
