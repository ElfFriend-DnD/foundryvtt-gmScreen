import { MODULE_ABBREV, MODULE_ID, MySettings } from './constants';

export const registerSettings = function () {
  game.settings.register(MODULE_ID, MySettings.gmScreenConfig, {
    name: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.name`,
    default: {},
    type: Boolean,
    scope: 'world',
    config: false,
    hint: `${MODULE_ABBREV}.settings.${MySettings.gmScreenConfig}.label`,
  });
};
