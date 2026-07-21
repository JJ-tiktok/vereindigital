import { describe, expect, it } from "vitest";

import { getDefaultSeasonWindow } from "@/lib/seasons";

describe("getDefaultSeasonWindow", () => {
  it("starts the season in the current year from July on", () => {
    const window = getDefaultSeasonWindow(new Date(2026, 7, 15));

    expect(window.name).toBe("2026/27");
    expect(window.startsAt).toEqual(new Date(2026, 6, 1, 0, 0, 0, 0));
    expect(window.endsAt.getFullYear()).toBe(2027);
  });

  it("uses the previous year before July", () => {
    const window = getDefaultSeasonWindow(new Date(2026, 2, 10));

    expect(window.name).toBe("2025/26");
    expect(window.startsAt).toEqual(new Date(2025, 6, 1, 0, 0, 0, 0));
  });

  it("keeps the window boundaries on July 1st and June 30th", () => {
    const window = getDefaultSeasonWindow(new Date(2026, 6, 1));

    expect(window.startsAt.getMonth()).toBe(6);
    expect(window.startsAt.getDate()).toBe(1);
    expect(window.endsAt.getMonth()).toBe(5);
    expect(window.endsAt.getDate()).toBe(30);
  });
});
