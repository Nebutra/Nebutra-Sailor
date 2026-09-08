import { describe, expect, it } from "vitest";
import { mapCviseProfileToResumeV1 } from "../../lib/resume/import-cvise";

/** Shape of a CVise localStorage["resume-profiles"] entry (legacy). */
const cvise = {
  id: "abc123",
  title: "我的简历",
  basic: {
    name: "张伟",
    name_en: "Zhang Wei",
    gender: "male",
    birth: "1999-01",
    phone: "13800000000",
    email: "zw@example.com",
    location: "上海",
    hukou: "江苏",
    website: "not a url",
    wechat: "zw_wx",
    linkedin: "zhang-wei",
  },
  objective: {
    jd_description: "Senior AI engineer at ...",
    jobMode: "targeted",
    summary: "全栈 + AI 应用工程师",
    advantage_tags: ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"],
    expected_salary: "30k",
    cities: ["上海"],
  },
  education: [
    {
      school: "复旦大学",
      major: "计算机",
      degree: "本科",
      period: "2017.09 - 2021.06",
      gpa: "3.8/4",
      courses: ["OS"],
    },
  ],
  campus_experiences: [
    { period: "2019", org: "学生会", title: "部长", details: ["组织活动 20 场"] },
  ],
  internships: [
    { period: "2020.06 - 2020.09", org: "字节跳动", title: "前端实习", rich: "<p>做了推荐页</p>" },
  ],
  projects: [
    { name: "RAG Demo", stack: ["Next.js"], details: ["QPS 200"], links: ["https://demo"] },
    { name: "" },
  ],
  achievements: [{ title: "ACM 银牌", level: "省", year: "2019", image: "data:...", brand: "acm" }],
  certificates: [{ name: "CET-6", year: "2019" }],
  skills: { programming: ["TypeScript"], ai_tools: ["Cursor"], unknown: ["x"] },
  publications: [{ title: "A paper", venue: "arXiv", year: "2024" }],
  patents: [],
  opensource: [{ repo: "zw/rag", stars: 120 }],
  links: {
    github: "zw",
    kaggle: "zw",
    zhihu: "zw",
    personal_website: "",
    portfolio: "https://zw.dev",
  },
  volunteering: [{ org: "红十字", role: "志愿者" }],
  interests: ["跑步"],
  references: [{ name: "someone" }],
  extras: ["x"],
  photo: { dataUrl: "data:...", shape: "circle", size: "sm" },
  preferences: {
    variant: "modern",
    length: "2pages",
    paper: "A4",
    language: "mix",
    max_bullets_per_entry: 4,
  },
  aiSuggestions: {},
};

describe("mapCviseProfileToResumeV1", () => {
  const out = mapCviseProfileToResumeV1(cvise);

  it("keeps identity and drops China-recruiting-only fields", () => {
    expect(out.basic.name).toBe("张伟");
    expect(out.basic.name_en).toBe("Zhang Wei");
    expect(out.basic.links).toEqual({
      github: "zw",
      linkedin: "zhang-wei",
      personal: "https://zw.dev",
    });
    expect(out.basic.website).toBeUndefined(); // invalid URL dropped
    expect(out.basic).not.toHaveProperty("hukou");
    expect(out.objective).not.toHaveProperty("jd_description");
    expect(out.objective.advantage_tags).toHaveLength(8);
  });

  it("merges internships and campus into experiences with kinds, rich → details", () => {
    expect(out.experiences).toEqual([
      {
        kind: "work",
        period: "2020.06 - 2020.09",
        org: "字节跳动",
        title: "前端实习",
        details: ["<p>做了推荐页</p>"],
      },
      { kind: "campus", period: "2019", org: "学生会", title: "部长", details: ["组织活动 20 场"] },
    ]);
  });

  it("filters empty entries and unknown skill categories", () => {
    expect(out.projects).toHaveLength(1);
    expect(out.skills).toEqual({ programming: ["TypeScript"], ai_tools: ["Cursor"] });
    expect(out.patents).toEqual([]);
  });

  it("drops photo, references, extras, aiSuggestions and template variant", () => {
    expect(out).not.toHaveProperty("photo");
    expect(out).not.toHaveProperty("references");
    expect(out).not.toHaveProperty("extras");
    expect(out).not.toHaveProperty("aiSuggestions");
    expect(out.preferences).toMatchObject({
      length: "2pages",
      paper: "A4",
      max_bullets_per_entry: 4,
      show_icons: true,
    });
    expect(out.preferences).not.toHaveProperty("variant");
  });

  it("throws when the result is still invalid (no name)", () => {
    expect(() => mapCviseProfileToResumeV1({ basic: {} })).toThrow();
  });
});
