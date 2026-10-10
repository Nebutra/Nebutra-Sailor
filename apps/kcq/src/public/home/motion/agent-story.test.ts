import { describe, expect, it } from "vitest";
import { storyProgress } from "./agent-story";

describe("agent story progress", () => {
  // Pin at 88px (header + 24), a 600px console, a 1260px runway right after it.
  const PIN = 88;
  const HEIGHT = 600;
  const RUNWAY = 1260;

  it("is 0 until the console reaches the pin line", () => {
    expect(storyProgress(PIN, HEIGHT, 2000, RUNWAY)).toBe(0);
    expect(storyProgress(PIN, HEIGHT, PIN + HEIGHT, RUNWAY)).toBe(0);
  });

  it("follows the scroll through the runway and reverses with it", () => {
    expect(storyProgress(PIN, HEIGHT, PIN + HEIGHT - RUNWAY / 2, RUNWAY)).toBeCloseTo(0.5);
    expect(storyProgress(PIN, HEIGHT, PIN + HEIGHT - RUNWAY / 4, RUNWAY)).toBeCloseTo(0.25);
  });

  it("holds at 1 once the runway has scrolled past", () => {
    expect(storyProgress(PIN, HEIGHT, PIN + HEIGHT - RUNWAY, RUNWAY)).toBe(1);
    expect(storyProgress(PIN, HEIGHT, -5000, RUNWAY)).toBe(1);
  });

  it("treats a collapsed runway as finished", () => {
    expect(storyProgress(PIN, HEIGHT, 0, 0)).toBe(1);
  });
});
