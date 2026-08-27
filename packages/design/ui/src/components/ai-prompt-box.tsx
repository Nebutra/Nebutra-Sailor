/**
 * @nebutra/ui — ai-prompt-box
 *
 * Composition layer: re-exports all sub-modules so that consumers and
 * `index.ts` (`export * from "./ai-prompt-box"`) continue to work with
 * zero changes.
 *
 * Internal split:
 *   voice-visualizer      — VoiceRecorder + visualizer constants
 *   file-attachment-zone  — ImageViewDialog + PromptAttachmentPreviews + file utils
 *   prompt-input          — PromptInput* primitives + reducer + PromptInputBox
 */

export * from "./ai-prompt-box/file-attachment-zone";
export * from "./ai-prompt-box/prompt-input";
export * from "./ai-prompt-box/voice-visualizer";
