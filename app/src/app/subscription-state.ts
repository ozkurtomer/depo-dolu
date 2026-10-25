export interface TopicClient {
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
}

export interface TopicStorage {
  read(): Promise<string[]>;
  write(topics: string[]): Promise<void>;
}

/** Başarısız temizlikleri cihazda tutar; sonraki denemede tekrar çıkar. */
export class TopicSubscriptions {
  private queue: Promise<void> = Promise.resolve();
  private client: TopicClient;
  private storage: TopicStorage;

  constructor(client: TopicClient, storage: TopicStorage) {
    this.client = client;
    this.storage = storage;
  }

  reconcile(topic: string | null, previousTopic?: string | null): Promise<void> {
    const operation = this.queue.then(() => this.apply(topic, previousTopic));
    this.queue = operation.catch(() => {});
    return operation;
  }

  private async apply(topic: string | null, previousTopic?: string | null): Promise<void> {
    const known = new Set(await this.storage.read());
    if (previousTopic) known.add(previousTopic);
    if (topic) {
      // İstek belirsiz sonuçlanırsa bile daha sonra bu konuyu temizleyebiliriz.
      known.add(topic);
      await this.storage.write([...known]);
      await this.client.subscribe(topic);
    }
    for (const old of [...known]) {
      if (old === topic) continue;
      await this.client.unsubscribe(old);
      known.delete(old);
      await this.storage.write([...known]);
    }
  }
}
