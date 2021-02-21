type Awaited<T> = T extends PromiseLike<infer U> ? Awaited<U> : T;

declare function fromUuid(uuid: string): Promise<JournalEntry | RollTable | Actor | Item | Entity>;
