export interface GmScreenConfig {
  grid: GmScreenGrid;
}

export interface GmScreenGrid {
  entries: Record<string, GmScreenGridEntry>; // keyed by cellId
}

export interface GmScreenGridEntry {
  x: number;
  y: number;
  spanRows?: number;
  spanCols?: number;
  entityUuid?: string;
  entryId: string;
}
