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
