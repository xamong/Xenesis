/**
 * P6 (e): Commitments subsystem barrel.
 *
 * An OPT-IN (default OFF) subsystem that extracts INFERRED future follow-ups from completed
 * interactive turns using an AUX/cheap model with TOOLS DISABLED, persists them, and surfaces
 * due ones as one-shot AgentTasks routed through the unattended [SILENT]/isolated path. The
 * extractor NEVER schedules cron — explicit "remind me"/"schedule" requests are cron-owned.
 */
export * from "./types.js";
export * from "./config.js";
export * from "./extraction.js";
export * from "./store.js";
export * from "./runtime.js";
