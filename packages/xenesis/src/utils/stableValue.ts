export interface StableValueContext {
  functionRefs: WeakMap<Function, number>;
  nextFunctionRef: number;
  nextObjectRef: number;
  nextSymbolRef: number;
  objectRefs: WeakMap<object, number>;
  symbolRefs: Map<symbol, number>;
}

function createStableValueContext(): StableValueContext {
  return {
    functionRefs: new WeakMap(),
    nextFunctionRef: 1,
    nextObjectRef: 1,
    nextSymbolRef: 1,
    objectRefs: new WeakMap(),
    symbolRefs: new Map()
  };
}

function compareBinary(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function functionRef(value: Function, context: StableValueContext): number {
  const existing = context.functionRefs.get(value);
  if (existing !== undefined) return existing;
  const next = context.nextFunctionRef;
  context.nextFunctionRef += 1;
  context.functionRefs.set(value, next);
  return next;
}

function objectRef(value: object, context: StableValueContext): number {
  const existing = context.objectRefs.get(value);
  if (existing !== undefined) return existing;
  const next = context.nextObjectRef;
  context.nextObjectRef += 1;
  context.objectRefs.set(value, next);
  return next;
}

function symbolRef(value: symbol, context: StableValueContext): number {
  const existing = context.symbolRefs.get(value);
  if (existing !== undefined) return existing;
  const next = context.nextSymbolRef;
  context.nextSymbolRef += 1;
  context.symbolRefs.set(value, next);
  return next;
}

function stablePropertyKey(key: string | symbol, context: StableValueContext): string {
  if (typeof key === "symbol") return `symbol:${symbolRef(key, context)}`;
  return `string:${JSON.stringify(key)}`;
}

function isPlainObject(value: object): boolean {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function stableValueKey(
  value: unknown,
  context: StableValueContext = createStableValueContext(),
  visiting: WeakSet<object> = new WeakSet()
): string {
  if (value === null) return "null";

  switch (typeof value) {
    case "bigint":
      return `bigint:${value.toString()}`;
    case "boolean":
      return `boolean:${value}`;
    case "function":
      return `function:${functionRef(value, context)}`;
    case "number":
      if (Object.is(value, -0)) return "number:-0";
      if (Number.isNaN(value)) return "number:NaN";
      return `number:${value}`;
    case "string":
      return `string:${JSON.stringify(value)}`;
    case "symbol":
      return `symbol:${symbolRef(value, context)}`;
    case "undefined":
      return "undefined";
    case "object":
      break;
  }

  if (visiting.has(value)) return `cycle:${objectRef(value, context)}`;

  if (Array.isArray(value)) {
    visiting.add(value);
    try {
      const children: string[] = [];
      for (let index = 0; index < value.length; index += 1) {
        if (Object.prototype.hasOwnProperty.call(value, index)) {
          children.push(stableValueKey(value[index], context, visiting));
        } else {
          children.push("array-hole");
        }
      }
      return `array:[${children.join(",")}]`;
    } finally {
      visiting.delete(value);
    }
  }

  if (!isPlainObject(value)) {
    return `object-ref:${objectRef(value, context)}:${Object.prototype.toString.call(value)}`;
  }

  visiting.add(value);
  try {
    return `object:{${Reflect.ownKeys(value)
      .filter((key) => Object.prototype.propertyIsEnumerable.call(value, key))
      .map((key) => [
        stablePropertyKey(key, context),
        stableValueKey((value as Record<PropertyKey, unknown>)[key], context, visiting)
      ] as const)
      .sort(([left], [right]) => compareBinary(left, right))
      .map(([key, child]) => `${key}:${child}`)
      .join(",")}}`;
  } finally {
    visiting.delete(value);
  }
}

export function stableValuesDiffer(left: unknown, right: unknown): boolean {
  const context = createStableValueContext();
  return stableValueKey(left, context, new WeakSet()) !== stableValueKey(right, context, new WeakSet());
}
