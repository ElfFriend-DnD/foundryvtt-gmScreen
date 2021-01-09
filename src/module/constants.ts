export const MODULE_ID = 'gm-screen';
export const MODULE_ABBREV = 'GMSCR';

export const TEMPLATES = {
  screen: `modules/${MODULE_ID}/templates/screen.hbs`,
  compactRollTable: `modules/${MODULE_ID}/templates/parts/compact-roll-table.hbs`,
  compactJournalEntry: `modules/${MODULE_ID}/templates/parts/compact-journal-entry.hbs`,
};

export enum MySettings {
  columns = 'columns',
  displayDrawer = 'display-as-drawer',
  drawerHeight = 'drawer-height',
  drawerOpacity = 'drawer-opacity',
  drawerWidth = 'drawer-width',
  gmScreenConfig = 'gm-screen-config',
  migrated = 'migrated',
  reset = 'reset',
  rightMargin = 'right-margin',
  rows = 'rows',
}

export enum MyHooks {
  openClose = 'gmScreenOpenClose',
  ready = 'gmScreenReady',
}

export enum MyFlags {}

export const numberRegex = /([+-]?(?=\.\d|\d)(?:\d+)?(?:\.?\d*))(?:[eE]([+-]?\d+))?/;
