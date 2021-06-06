type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

declare namespace Game {
  interface Module {
    api?: Record<string, any>;
  }
}

declare namespace RollTable {
  interface Result {
    collection?: string;
    type: ValueOf<typeof CONST.TABLE_RESULT_TYPES>;
    resultId: string;
    text?: string;
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

declare interface User {
  isGM: boolean;
}
