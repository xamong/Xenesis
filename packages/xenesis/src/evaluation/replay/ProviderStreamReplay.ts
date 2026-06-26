import type { AgentProvider, ProviderRequest, ProviderStreamEvent } from "../../providers/types.js";

export interface CollectProviderStreamReplayEventsOptions {
  requiredEventTypes?: ProviderStreamEvent["type"][];
}

export async function collectProviderStreamReplayEvents(
  provider: AgentProvider,
  request: ProviderRequest,
  options: CollectProviderStreamReplayEventsOptions = {}
): Promise<ProviderStreamEvent[]> {
  if (!provider.stream) {
    throw new Error(`Provider "${provider.name}" does not support stream replay.`);
  }

  const events: ProviderStreamEvent[] = [];
  for await (const event of provider.stream(request)) {
    events.push(event);
  }
  const observedTypes = new Set(events.map((event) => event.type));
  for (const requiredType of options.requiredEventTypes ?? []) {
    if (!observedTypes.has(requiredType)) {
      throw new Error(`Provider "${provider.name}" stream replay missing required event type "${requiredType}".`);
    }
  }
  return events;
}
