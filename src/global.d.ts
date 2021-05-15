type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

declare function fromUuid(uuid: string): Promise<JournalEntry | RollTable | Actor | Item | Entity>;

declare namespace Game {
  interface Module {
    api?: Record<string, any>;
  }
}

// declare namespace RollTableConfig {
//   interface Data {
//     results: RollTable.Result[];
//   }
// }

declare namespace RollTable {
  interface Result {
    collection?: string;
  }
}

/* 0.8.2 overrides */

declare interface Actors {
  contents: any;
}
declare interface Items {
  contents: any;
}
declare interface Journal {
  contents: any;
}
declare interface RollTables {
  contents: any;
}

declare interface FoundryDocument {
  documentName: string;
  sheet: DocumentSheet;
}
