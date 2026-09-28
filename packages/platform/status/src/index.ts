/**
 * @nebutra/status — the status and incident core.
 *
 * Probes public surfaces (with confirm-retry), keeps per-day check counts in a
 * KV that lives outside the app stack (Upstash REST, in-memory for dev), holds
 * incidents and maintenance, and fans every incident write out to chat
 * channels. Pages, feeds and admin tools are outputs built on top of it.
 */
export * from "./history";
export * from "./incidents";
export * from "./math";
export * from "./notify";
export * from "./probe";
export { getStatusKv, isStatusHistoryDurable, type StatusKv, setStatusKvForTests } from "./store";
