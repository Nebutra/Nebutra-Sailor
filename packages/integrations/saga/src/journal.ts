export type SagaJournalEventType =
  | "saga.started"
  | "saga.completed"
  | "saga.failed"
  | "step.completed"
  | "step.failed"
  | "compensation.started"
  | "compensation.completed"
  | "compensation.failed";

export interface SagaJournalEvent<TContext = unknown> {
  id: string;
  executionId: string;
  saga: string;
  type: SagaJournalEventType;
  at: string;
  step?: string;
  error?: string;
  context?: TContext;
  metadata?: Record<string, unknown>;
}

export interface SagaJournal<TContext = unknown> {
  append(event: SagaJournalEvent<TContext>): Promise<void>;
  list(executionId: string): Promise<SagaJournalEvent<TContext>[]>;
}

export class InMemorySagaJournal<TContext = unknown> implements SagaJournal<TContext> {
  private events: SagaJournalEvent<TContext>[] = [];

  async append(event: SagaJournalEvent<TContext>): Promise<void> {
    this.events.push(event);
  }

  async list(executionId: string): Promise<SagaJournalEvent<TContext>[]> {
    return this.events.filter((event) => event.executionId === executionId);
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}
