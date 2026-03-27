import type { EventBus } from "@nebutra/event-bus";

export interface SagaStep<TContext = unknown> {
  name: string;
  execute: (context: TContext) => Promise<TContext>;
  compensate?: (context: TContext) => Promise<void>;
}

export interface SagaResult<TContext = unknown> {
  success: boolean;
  context: TContext;
  completedSteps: string[];
  failedStep?: string;
  error?: string;
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
  async execute(initialContext: TContext): Promise<SagaResult<TContext>> {
    const completedSteps: string[] = [];
    let context = initialContext;

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

          // Compensate in reverse order
          await this.compensate(context, completedSteps);

          return {
            success: false,
            context,
            completedSteps,
            failedStep: step.name,
            error: error instanceof Error ? error.message : String(error),
          };
        }
      }

      // All steps completed
      await this.eventBus.publish(
        this.eventBus.createEvent("saga.completed", {
          saga: this.name,
          completedSteps,
        }),
      );

      return {
        success: true,
        context,
        completedSteps,
      };
    } catch (error) {
      return {
        success: false,
        context,
        completedSteps,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute compensation steps in reverse order
   */
  private async compensate(context: TContext, completedSteps: string[]): Promise<void> {
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
          await step.compensate(context);
          await this.eventBus.publish(
            this.eventBus.createEvent("saga.compensation.completed", {
              saga: this.name,
              step: stepName,
            }),
          );
        } catch (error) {
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
}

/**
 * Create a new saga
 */
export function createSaga<TContext = unknown>(
  name: string,
  eventBus: EventBus,
): SagaOrchestrator<TContext> {
  return new SagaOrchestrator<TContext>(name, eventBus);
}
