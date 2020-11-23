export interface GmScreenConfig {
  grid: GmScreenGrid;
}

export interface GmScreenGrid {
  columns: number;
  rows: number;
  entries: GmScreenGridEntry[];
}

export interface GmScreenGridEntry {
  x: number;
  y: number;
  journalId: string;
}
