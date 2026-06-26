import type {
  BlockingHookRegistration,
  PreToolUseDecision,
  PreToolUsePayload,
  PreToolUseRegistration,
  StopDecision,
  StopPayload,
  StopRegistration,
} from "./blocking.js";

interface Logger {
  warn(message: string): void;
}

interface CompiledPre extends PreToolUseRegistration {
  compiled?: RegExp;
}

export class HookRegistry {
  private readonly pre: CompiledPre[] = [];
  private readonly stop: StopRegistration[] = [];
  constructor(private readonly logger?: Logger) {}

  register(reg: BlockingHookRegistration): void {
    if (reg.event === "pre_tool_use") {
      this.pre.push({
        ...reg,
        compiled: reg.toolNamePattern ? new RegExp(reg.toolNamePattern) : undefined,
      });
    } else {
      this.stop.push(reg);
    }
  }

  hasPreToolUse(): boolean {
    return this.pre.length > 0;
  }
  hasStop(): boolean {
    return this.stop.length > 0;
  }

  async runPreToolUse(payload: PreToolUsePayload): Promise<PreToolUseDecision> {
    let modified: Extract<PreToolUseDecision, { decision: "modify" }> | undefined;
    let askDecision: Extract<PreToolUseDecision, { decision: "ask" }> | undefined;
    for (const reg of this.pre) {
      if (reg.compiled && !reg.compiled.test(payload.toolName)) continue;
      let d: PreToolUseDecision | undefined;
      try {
        d = (await reg.handler(payload)) ?? { decision: "allow" };
      } catch (error) {
        this.logger?.warn(
          `PreToolUse hook threw; failing open (allow): ${String(error)}`,
        );
        d = { decision: "allow" };
      }
      if (d.decision === "block") return d; // most-restrictive: short-circuit
      if (d.decision === "modify") modified = d; // last-modify-wins
      if (d.decision === "ask" && !askDecision) askDecision = d; // first ask wins
    }
    // Precedence: block (short-circuited above) > ask > modify > allow
    if (askDecision) return askDecision;
    if (modified) return modified;
    return { decision: "allow" };
  }

  async runStop(payload: StopPayload): Promise<StopDecision> {
    for (const reg of this.stop) {
      let d: StopDecision | undefined;
      try {
        d = (await reg.handler(payload)) ?? { decision: "allow-stop" };
      } catch (error) {
        this.logger?.warn(
          `Stop hook threw; failing open (allow-stop): ${String(error)}`,
        );
        d = { decision: "allow-stop" };
      }
      if (d.decision === "block-stop") return d; // first-block-wins
    }
    return { decision: "allow-stop" };
  }
}
