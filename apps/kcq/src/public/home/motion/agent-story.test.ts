import { describe, expect, it } from "vitest";
import { storyProgress } from "./agent-story";

describe("agent story progress", () => {
  // Pin at 88px (header + 24), a 600px console sticky inside a 1000px track (400px of scroll).
  const PIN = 88;
  const HEIGHT = 600;
  const TRACK = 1000;

  it("is 0 until the track reaches the pin line", () => {
    expect(storyProgress(PIN, HEIGHT, 2000, TRACK)).toBe(0);
    expect(storyProgress(PIN, HEIGHT, PIN, TRACK)).toBe(0);
  });

  it("follows the scroll through the track and reverses with it", () => {
    expect(storyProgress(PIN, HEIGHT, PIN - 200, TRACK)).toBeCloseTo(0.5);
    expect(storyProgress(PIN, HEIGHT, PIN - 100, TRACK)).toBeCloseTo(0.25);
  });

  it("holds at 1 once the console meets the track's end", () => {
    expect(storyProgress(PIN, HEIGHT, PIN - 400, TRACK)).toBe(1);
    expect(storyProgress(PIN, HEIGHT, -5000, TRACK)).toBe(1);
  });

  it("treats a track no taller than the console as finished", () => {
    expect(storyProgress(PIN, HEIGHT, 0, HEIGHT)).toBe(1);
  });

  it("starts a lead before the pin line and spreads it over the lead and the runway", () => {
    // Lead 400px: starts with the track's top at 488px, ends 400px of runway past the pin.
    expect(storyProgress(PIN, HEIGHT, PIN + 400, TRACK, 400)).toBe(0);
    expect(storyProgress(PIN, HEIGHT, PIN + 600, TRACK, 400)).toBe(0);
    expect(storyProgress(PIN, HEIGHT, PIN, TRACK, 400)).toBeCloseTo(0.5);
    expect(storyProgress(PIN, HEIGHT, PIN - 400, TRACK, 400)).toBe(1);
  });

  it("can play entirely on the way in when the track has no runway", () => {
    expect(storyProgress(PIN, HEIGHT, PIN + 300, HEIGHT, 600)).toBeCloseTo(0.5);
    expect(storyProgress(PIN, HEIGHT, PIN, HEIGHT, 600)).toBe(1);
  });
});
