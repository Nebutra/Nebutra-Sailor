import { describe, expect, it } from "vitest";
import type { EasterEggEntry } from "../microcopy";
import { EASTER_EGG_REGISTRY, getMilestoneCopy, MILESTONE_COPY_PACK } from "../microcopy";

// ---------------------------------------------------------------------------
// MILESTONE_COPY_PACK — shape + count
// ---------------------------------------------------------------------------

describe("MILESTONE_COPY_PACK", () => {
  it("has exactly 14 entries (§8.3)", () => {
    expect(MILESTONE_COPY_PACK.length).toBe(14);
  });

  it("every entry has non-empty zh-CN primaryCopy", () => {
    for (const entry of MILESTONE_COPY_PACK) {
      expect(entry.copy["zh-CN"].primary, `zh-CN primary missing for ${entry.id}`).toBeTruthy();
    }
  });

  it("every entry has non-empty en-US primaryCopy", () => {
    for (const entry of MILESTONE_COPY_PACK) {
      expect(entry.copy["en-US"].primary, `en-US primary missing for ${entry.id}`).toBeTruthy();
    }
  });

  it("ids are unique", () => {
    const ids = MILESTONE_COPY_PACK.map((e) => e.id);
    expect(new Set(ids).size).toBe(MILESTONE_COPY_PACK.length);
  });

  it("contains all 14 expected MilestoneIds", () => {
    const ids = MILESTONE_COPY_PACK.map((e) => e.id);
    const expected = [
      "first_room",
      "first_folder",
      "first_table",
      "first_signal",
      "first_ship",
      "first_believer",
      "first_revenue",
      "first_return",
      "first_team",
      "first_crowd",
      "first_reset",
      "first_public",
      "first_demo",
      "graduation",
    ];
    for (const id of expected) {
      expect(ids, `Missing id: ${id}`).toContain(id);
    }
  });
});

// ---------------------------------------------------------------------------
// §8.3 table parity — voiceRegister / act / easterEggLayer
// ---------------------------------------------------------------------------

describe("MILESTONE_COPY_PACK table parity (§8.3)", () => {
  it("first_room: voiceRegister=historian, act=starting, layer=metaphor", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "first_room");
    expect(e?.voiceRegister).toBe("historian");
    expect(e?.act).toBe("starting");
    expect(e?.easterEggLayer).toBe("metaphor");
  });

  it("first_folder: voiceRegister=companion, act=starting, layer=metaphor", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "first_folder");
    expect(e?.voiceRegister).toBe("companion");
    expect(e?.act).toBe("starting");
    expect(e?.easterEggLayer).toBe("metaphor");
  });

  it("first_crowd: easterEggLayer=echo (the only echo entry in §8.3)", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "first_crowd");
    expect(e?.easterEggLayer).toBe("echo");
    expect(e?.act).toBe("growing");
  });

  it("first_reset: act=starting + throughline=failure (MC-H2: no '纵贯' act)", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "first_reset");
    expect(e?.act).toBe("starting");
    expect(e?.throughline).toBe("failure");
    // Must NOT have act value of '纵贯' — TypeScript enforces this but verify shape
    expect(e?.act).not.toBe("纵贯");
  });

  it("graduation: voiceRegister=graduation, act=growing, surface=graduation", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "graduation");
    expect(e?.voiceRegister).toBe("graduation");
    expect(e?.act).toBe("growing");
    expect(e?.surface).toBe("graduation");
  });

  it("first_reset: voiceRegister=mentor", () => {
    const e = MILESTONE_COPY_PACK.find((x) => x.id === "first_reset");
    expect(e?.voiceRegister).toBe("mentor");
  });
});

// ---------------------------------------------------------------------------
// getMilestoneCopy — locale lookup
// ---------------------------------------------------------------------------

describe("getMilestoneCopy", () => {
  it("returns zh-CN primary for first_folder", () => {
    const result = getMilestoneCopy("first_folder", "zh-CN");
    expect(result.primary).toBe("许多公司，最初只是一个文件夹。");
  });

  it("returns en-US primary for first_folder", () => {
    const result = getMilestoneCopy("first_folder", "en-US");
    expect(result.primary).toBe("Many companies begin as a folder.");
  });

  it("returns zh-CN primary for first_reset", () => {
    const result = getMilestoneCopy("first_reset", "zh-CN");
    expect(result.primary).toBe("重启不是失败，是更诚实的开始。");
  });

  it("returns en-US primary for first_reset", () => {
    const result = getMilestoneCopy("first_reset", "en-US");
    expect(result.primary).toBe("A restart is a more honest beginning.");
  });

  it("returns zh-CN primary for graduation", () => {
    const result = getMilestoneCopy("graduation", "zh-CN");
    expect(result.primary).toBe("你出师了。下一程需要更强的装备。");
  });

  it("returns en-US primary for graduation", () => {
    const result = getMilestoneCopy("graduation", "en-US");
    expect(result.primary).toBe("You've outgrown the basics. The road ahead needs stronger tools.");
  });

  it("returns zh-CN for first_crowd", () => {
    const result = getMilestoneCopy("first_crowd", "zh-CN");
    expect(result.primary).toBe("第一张桌子坐不下了。");
  });

  it("throws for an unknown milestone id", () => {
    expect(() =>
      getMilestoneCopy("nonexistent" as Parameters<typeof getMilestoneCopy>[0], "zh-CN"),
    ).toThrow(/unknown MilestoneId/);
  });

  it("type round-trips: returned shape has primary string", () => {
    const result = getMilestoneCopy("first_room", "en-US");
    expect(typeof result.primary).toBe("string");
    expect(result.primary.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 回响层 ≤25% ceiling guard (§6.2)
// ---------------------------------------------------------------------------

describe("echo-layer ratio ≤25% (§6.2)", () => {
  it("echo entries are at most 25% of the pack", () => {
    const echoCount = MILESTONE_COPY_PACK.filter((e) => e.easterEggLayer === "echo").length;
    const ratio = echoCount / MILESTONE_COPY_PACK.length;
    expect(ratio, `Echo ratio ${ratio.toFixed(2)} exceeds 25%`).toBeLessThanOrEqual(0.25);
  });

  it("currently exactly 1 echo entry (first_crowd)", () => {
    const echoEntries = MILESTONE_COPY_PACK.filter((e) => e.easterEggLayer === "echo");
    expect(echoEntries.length).toBe(1);
    expect(echoEntries[0]?.id).toBe("first_crowd");
  });
});

// ---------------------------------------------------------------------------
// EASTER_EGG_REGISTRY — schema validity + echo-layer invariants
// ---------------------------------------------------------------------------

describe("EASTER_EGG_REGISTRY", () => {
  it("all entries have layer:'echo' (MC-M1: registry is echo-layer only)", () => {
    for (const entry of EASTER_EGG_REGISTRY) {
      expect(entry.layer, `entry ${entry.id} has layer '${entry.layer}', expected 'echo'`).toBe(
        "echo",
      );
    }
  });

  it("every echo entry has a non-empty sourceInspiration (§8.2 回响层必填)", () => {
    for (const entry of EASTER_EGG_REGISTRY) {
      expect(entry.sourceInspiration, `sourceInspiration missing for ${entry.id}`).toBeTruthy();
    }
  });

  it("every echo entry has a non-empty secondaryCopy (second layer text)", () => {
    for (const entry of EASTER_EGG_REGISTRY) {
      const typed = entry as EasterEggEntry;
      expect(typed.secondaryCopy, `secondaryCopy missing for ${entry.id}`).toBeTruthy();
    }
  });

  it("sourceInspiration values are unique within the registry (防重 §6.7)", () => {
    const inspirations = EASTER_EGG_REGISTRY.map((e) => e.sourceInspiration);
    const unique = new Set(inspirations);
    expect(
      unique.size,
      "Duplicate sourceInspiration values detected — same cultural source used multiple times",
    ).toBe(inspirations.length);
  });

  it("ids are unique", () => {
    const ids = EASTER_EGG_REGISTRY.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("contains the 4 canonical §6.3 echo examples", () => {
    const ids = EASTER_EGG_REGISTRY.map((e) => e.id);
    expect(ids).toContain("echo-localhost");
    expect(ids).toContain("echo-general-magic");
    expect(ids).toContain("echo-ramen");
    expect(ids).toContain("echo-first-room");
  });

  it("every entry has a valid riskLevel", () => {
    const valid = ["low", "medium", "high"];
    for (const entry of EASTER_EGG_REGISTRY) {
      expect(valid, `Invalid riskLevel for ${entry.id}`).toContain(entry.riskLevel);
    }
  });
});

// ---------------------------------------------------------------------------
// SSOT self-passes 七禁令 (§7.1)
// ---------------------------------------------------------------------------

describe("七禁令 self-check — SSOT strings must not violate the seven prohibitions", () => {
  const bannedEmojis = /[🎉🚀🔥🌟⚡]/u;
  const bannedExclamation = /[!！]/;
  const bannedMotivational = /加油|你能行|冲鸭|梦想成真|恭喜|太棒了|失败是成功之母|下一个独角兽/;
  const bannedLinkedIn = /赋能|闭环|抓手|颗粒度|打法|数字化转型|请您|为了更好地服务您|系统检测到/;
  const bannedStartupBro = /\bcrush it\b|\b10x\b|\bhustle\b|\bgrind\b|\bkill it\b/i;
  const bannedShaming = /你失败了|操作失败，请重试/;
  const bannedVacuousSuccess = /越努力越幸运/;

  function getAllPackStrings(): Array<{ source: string; value: string }> {
    const results: Array<{ source: string; value: string }> = [];
    for (const entry of MILESTONE_COPY_PACK) {
      for (const locale of ["zh-CN", "en-US"] as const) {
        const copy = entry.copy[locale];
        results.push({ source: `pack:${entry.id}:${locale}:primary`, value: copy.primary });
        if (copy.secondary)
          results.push({ source: `pack:${entry.id}:${locale}:secondary`, value: copy.secondary });
        if (copy.cta) results.push({ source: `pack:${entry.id}:${locale}:cta`, value: copy.cta });
      }
    }
    return results;
  }

  function getAllRegistryStrings(): Array<{ source: string; value: string }> {
    const results: Array<{ source: string; value: string }> = [];
    for (const entry of EASTER_EGG_REGISTRY) {
      results.push({ source: `registry:${entry.id}:primary`, value: entry.primaryCopy });
      results.push({ source: `registry:${entry.id}:secondary`, value: entry.secondaryCopy });
    }
    return results;
  }

  const allStrings = [...getAllPackStrings(), ...getAllRegistryStrings()];

  it("no banned emoji (🎉🚀🔥🌟⚡)", () => {
    for (const { source, value } of allStrings) {
      expect(bannedEmojis.test(value), `Banned emoji found in ${source}: "${value}"`).toBe(false);
    }
  });

  it("no exclamation marks (! or ！)", () => {
    for (const { source, value } of allStrings) {
      expect(bannedExclamation.test(value), `Exclamation mark found in ${source}: "${value}"`).toBe(
        false,
      );
    }
  });

  it("no 禁一 motivational shouts (加油/你能行/冲鸭/梦想成真/恭喜/太棒了)", () => {
    for (const { source, value } of allStrings) {
      expect(
        bannedMotivational.test(value),
        `禁一 motivational banned phrase in ${source}: "${value}"`,
      ).toBe(false);
    }
  });

  it("no 禁四 LinkedIn/老板味 phrases (赋能/闭环/抓手/…)", () => {
    for (const { source, value } of allStrings) {
      expect(
        bannedLinkedIn.test(value),
        `禁四 LinkedIn/boss-speak found in ${source}: "${value}"`,
      ).toBe(false);
    }
  });

  it("no English startup-bro phrases (crush it / 10x / hustle / grind)", () => {
    for (const { source, value } of allStrings) {
      expect(
        bannedStartupBro.test(value),
        `Startup-bro language found in ${source}: "${value}"`,
      ).toBe(false);
    }
  });

  it("no 禁七 failure shaming (你失败了 / 操作失败，请重试)", () => {
    for (const { source, value } of allStrings) {
      expect(bannedShaming.test(value), `禁七 shaming phrase in ${source}: "${value}"`).toBe(false);
    }
  });

  it("no 禁二 vacuous success formulas (越努力越幸运)", () => {
    for (const { source, value } of allStrings) {
      expect(
        bannedVacuousSuccess.test(value),
        `禁二 vacuous success formula in ${source}: "${value}"`,
      ).toBe(false);
    }
  });
});
