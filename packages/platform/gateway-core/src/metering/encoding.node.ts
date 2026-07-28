/**
 * Node build: the real tokenizer.
 *
 * js-tiktoken carries the BPE rank tables for every encoding it supports —
 * several megabytes of data that must be parsed when the module is imported.
 * That is fine in a long-lived process and fatal in a Worker, where the whole
 * bundle has a few hundred milliseconds of CPU to finish starting.
 */
export { getEncoding } from "js-tiktoken";
