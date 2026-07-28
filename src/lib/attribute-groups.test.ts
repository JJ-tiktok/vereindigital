import { describe, expect, it } from "vitest";

import { mapPositionToGroup } from "@/lib/attribute-groups";

describe("mapPositionToGroup", () => {
  it("maps the goalkeeper position", () => {
    expect(mapPositionToGroup("TW")).toBe("GOALKEEPER");
  });

  it("maps defender and fullback positions distinctly", () => {
    expect(mapPositionToGroup("IV")).toBe("DEFENDER");
    expect(mapPositionToGroup("AV")).toBe("FULLBACK");
  });

  it("maps all midfield abbreviations to MIDFIELDER", () => {
    expect(mapPositionToGroup("DM")).toBe("MIDFIELDER");
    expect(mapPositionToGroup("ZM")).toBe("MIDFIELDER");
    expect(mapPositionToGroup("OM")).toBe("MIDFIELDER");
  });

  it("maps winger and forward positions", () => {
    expect(mapPositionToGroup("FL")).toBe("WINGER");
    expect(mapPositionToGroup("ST")).toBe("FORWARD");
  });

  it("falls back to ALL for unknown or missing positions", () => {
    expect(mapPositionToGroup(null)).toBe("ALL");
    expect(mapPositionToGroup(undefined)).toBe("ALL");
    expect(mapPositionToGroup("")).toBe("ALL");
    expect(mapPositionToGroup("XX")).toBe("ALL");
  });
});
