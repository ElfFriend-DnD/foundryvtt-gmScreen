export interface GmScreenSettingsData {
  grids: Record<string, GmScreenGrid>; // object of all grids keyed by uuid
  activeGridId: keyof GmScreenSettingsData['grids']; // currently visible grid's id
}

export interface GmScreenGrid {
  entries: Record<string, GmScreenGridEntry>; // keyed by cellId
  id: string; // grid's uuid
  name: string; // user configurable
  isShared: boolean;
  rowOverride?: number;
  columnOverride?: number;
}

export interface GmScreenGridEntry {
  x: number;
  y: number;
  spanRows?: number;
  spanCols?: number;
  entityUuid?: string;
  entryId: string;
}

export interface GmScreenApi {
  toggleGmScreenVisibility(isOpen?: boolean): void;
  refreshGmScreen(): void;
}

export enum MySettings {
  columns = 'columns',
  displayDrawer = 'display-as-drawer',
  drawerHeight = 'drawer-height',
  drawerOpacity = 'drawer-opacity',
  drawerWidth = 'drawer-width',
  gmScreenConfig = 'gm-screen-config',
  migrated = 'migrated',
  condensedButton = 'condensedButton',
  reset = 'reset',
  rightMargin = 'right-margin',
  rows = 'rows',
}

export enum MyHooks {
  openClose = 'gmScreenOpenClose',
  ready = 'gmScreenReady',
}

export enum MyFlags {
  gmScreenSheetClass = 'gmScreenSheetClass',
}
