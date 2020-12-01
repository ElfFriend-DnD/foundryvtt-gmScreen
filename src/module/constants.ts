export const MODULE_ID = 'gm-screen';
export const MODULE_ABBREV = 'GMSCR';

export const TEMPLATES = {
  screen: `modules/${MODULE_ID}/templates/screen.hbs`,
  compactRollTable: `modules/${MODULE_ID}/templates/parts/compact-roll-table.hbs`,
};

export enum MySettings {
  gmScreenConfig = 'gm-screen-config',
}

export enum MyFlags {}

export const numberRegex = /([+-]?(?=\.\d|\d)(?:\d+)?(?:\.?\d*))(?:[eE]([+-]?\d+))?/;
