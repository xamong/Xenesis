export function normalizeBridgePathForPlatform(
  value: unknown,
  options?: { platform?: NodeJS.Platform | string },
): string;

export function normalizeBridgePathFields<T extends Record<string, unknown>>(
  payload: T,
  options?: { platform?: NodeJS.Platform | string },
): T;
