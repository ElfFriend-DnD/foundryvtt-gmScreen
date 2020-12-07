export interface GmScreenConfig {
  grid: GmScreenGrid;
}

export interface GmScreenGrid {
  entries: GmScreenGridEntry[];
}

export interface GmScreenGridEntry {
  x?: number;
  y?: number;
  entityUuid?: string;
}
