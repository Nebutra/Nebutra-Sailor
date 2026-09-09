/**
 * Setup for the `dom` vitest project only (see `vitest.config.ts`).
 *
 * `jest-dom` supplies `toBeInTheDocument` / `toBeDisabled`; the cleanup keeps
 * one test's tree from being queried by the next one, which is how a component
 * test starts passing for the wrong reason.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
