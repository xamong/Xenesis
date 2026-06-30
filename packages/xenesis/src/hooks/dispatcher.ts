import type { HookEmitter, HookEvent, HookHandler, HookName, HookResult, HookSubscription } from './types.js';

interface HandlerRegistration {
  handler: HookHandler;
  label?: string;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export class HookDispatcher implements HookEmitter {
  private readonly handlers = new Map<HookSubscription, HandlerRegistration[]>();

  register(subscription: HookSubscription, handler: HookHandler, label?: string) {
    const registrations = this.handlers.get(subscription) ?? [];
    registrations.push({ handler, label });
    this.handlers.set(subscription, registrations);
  }

  async emit(event: Omit<HookEvent, 'timestamp'>): Promise<HookResult[]> {
    const timestamp = new Date().toISOString();
    const fullEvent: HookEvent = {
      ...event,
      timestamp,
    };
    const registrations = [...this.registrationsFor('*'), ...this.registrationsFor(event.name)];
    const results: HookResult[] = [];

    for (const registration of registrations) {
      try {
        await registration.handler(fullEvent);
        results.push(this.result(event.name, timestamp, registration, true));
      } catch (error) {
        results.push(this.result(event.name, timestamp, registration, false, errorMessage(error)));
      }
    }

    return results;
  }

  private registrationsFor(subscription: HookSubscription) {
    return this.handlers.get(subscription) ?? [];
  }

  private result(
    name: HookName,
    timestamp: string,
    registration: HandlerRegistration,
    ok: boolean,
    error?: string,
  ): HookResult {
    return {
      name,
      timestamp,
      handler: registration.label,
      ok,
      error,
    };
  }
}
