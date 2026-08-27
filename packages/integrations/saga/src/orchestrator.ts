import type { EventBus } from "@nebutra/event-bus";
import type { SagaJournal, SagaJournalEventType } from "./journal";

export interface SagaStep<TContext = unknown> {
  name: string;
  execute: (context: TContext) => Promise<TContext>;
  compensate?: (context: TContext) => Promise<void>;
}

export interface SagaResult<TContext = unknown> {
  success: boolean;
  executionId?: string;
  context: TContext;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
}

export interface SagaExecuteOptions {
  executionId?: string;
}

export interface SagaOrchestratorOptions<TContext = unknown> {
  journal?: SagaJournal<TContext>;
}

/**
 * Saga Orchestrator for distributed transactions
 * Executes steps in order, compensates on failure
 *
 * Accepts an EventBus instance via constructor for testability —
 * production code passes the real eventBus, tests can supply a stub.
 */
export class SagaOrchestrator<TContext = unknown> {
  private steps: SagaStep<TContext>[] = [];

  constructor(
    private name: string,
    private readonly eventBus: EventBus,
    private readonly options: SagaOrchestratorOptions<TContext> = {},
  ) {}

  /**
   * Add a step to the saga
   */
  addStep(step: SagaStep<TContext>): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Execute the saga
   */
  async execute(
    initialContext: TContext,
    executeOptions: SagaExecuteOptions = {},
  ): Promise<SagaResult<TContext>> {
    const executionId = executeOptions.executionId ?? `saga_${crypto.randomUUID()}`;
    const completedSteps: string[] = [];
    let context = initialContext;

    await this.appendJournal("saga.started", executionId, { context });

    // Emit saga started event
    await this.eventBus.publish(
      this.eventBus.createEvent("saga.started", {
        saga: this.name,
        steps: this.steps.map((s) => s.name),
      }),
    );

    try {
      // Execute each step
      for (const step of this.steps) {
        try {
          context = await step.execute(context);
          completedSteps.push(step.name);
          await this.appendJournal("step.completed", executionId, {
            step: step.name,
            context,
          });

          await this.eventBus.publish(
            this.eventBus.createEvent("saga.step.completed", {
              saga: this.name,
              step: step.name,
            }),
          );
        } catch (error) {
          // Step failed, start compensation
          await this.eventBus.publish(
            this.eventBus.createEvent("saga.step.failed", {
              saga: this.name,
              step: step.name,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
          const errorMessage = error instanceof Error ? error.message : String(error);
          await this.appendJournal("step.failed", executionId, {
            step: step.name,
            context,
            error: errorMessage,
          });

          // Compensate in reverse order
          await this.compensate(context, completedSteps, executionId);
          await this.appendJournal("saga.failed", executionId, {
            context,
            error: errorMessage,
          });

          return {
            success: false,
            executionId,
            context,
            completedSteps,
            failedStep: step.name,
            error: errorMessage,
          };
        }
      }

      await this.appendJournal("saga.completed", executionId, { context });

      // All steps completed
      await this.eventBus.publish(
        this.eventBus.createEvent("saga.completed", {
          saga: this.name,
          completedSteps,
        }),
      );

      return {
        success: true,
        executionId,
        context,
        completedSteps,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.appendJournal("saga.failed", executionId, { context, error: errorMessage });
      return {
        success: false,
        executionId,
        context,
        completedSteps,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute compensation steps in reverse order
   */
  private async compensate(
    context: TContext,
    completedSteps: string[],
    executionId: string,
  ): Promise<void> {
    await this.eventBus.publish(
      this.eventBus.createEvent("saga.compensating", {
        saga: this.name,
        steps: completedSteps,
      }),
    );

    // Get completed steps in reverse order
    const stepsToCompensate = [...completedSteps].reverse();

    for (const stepName of stepsToCompensate) {
      const step = this.steps.find((s) => s.name === stepName);
      if (step?.compensate) {
        try {
          await this.appendJournal("compensation.started", executionId, {
            step: stepName,
            context,
          });
          await step.compensate(context);
          await this.appendJournal("compensation.completed", executionId, {
            step: stepName,
            context,
          });
          await this.eventBus.publish(
            this.eventBus.createEvent("saga.compensation.completed", {
              saga: this.name,
              step: stepName,
            }),
          );
        } catch (error) {
          await this.appendJournal("compensation.failed", executionId, {
            step: stepName,
            context,
            error: error instanceof Error ? error.message : String(error),
          });
          await this.eventBus.publish(
            this.eventBus.createEvent("saga.compensation.failed", {
              saga: this.name,
              step: stepName,
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      }
    }
  }

  private async appendJournal(
    type: SagaJournalEventType,
    executionId: string,
    details: {
      step?: string;
      context?: TContext;
      error?: string;
      metadata?: Record<string, unknown>;
    } = {},
  ): Promise<void> {
    if (!this.options.journal) return;

    await this.options.journal.append({
      id: `sje_${crypto.randomUUID()}`,
      executionId,
      saga: this.name,
      type,
      at: new Date().toISOString(),
      ...details,
    });
  }
}

/**
 * Create a new saga
 */
export function createSaga<TContext = unknown>(
  name: string,
  eventBus: EventBus,
  options?: SagaOrchestratorOptions<TContext>,
): SagaOrchestrator<TContext> {
  return new SagaOrchestrator<TContext>(name, eventBus, options);
}
