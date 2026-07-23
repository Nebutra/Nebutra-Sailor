export interface CategoryMeta {
  id: string;
  label: string;
  hint: string;
  accent: string;
}

const META: Record<string, Omit<CategoryMeta, "id">> = {
  codec: { label: "编解码", hint: "Base64 · URL · JWT", accent: "hsl(var(--primary))" },
  data: { label: "数据", hint: "JSON 与结构化数据", accent: "var(--cyan-9)" },
  dev: { label: "开发", hint: "UUID · 进制 · 命名", accent: "hsl(var(--primary))" },
  doc: { label: "文档", hint: "Markdown · PDF", accent: "var(--cyan-9)" },
  finance: { label: "财务", hint: "金额大写", accent: "hsl(var(--primary))" },
  hash: { label: "哈希与安全", hint: "MD5 · SHA · 密码", accent: "var(--cyan-9)" },
  image: { label: "图像", hint: "压缩 · 缩放 · 转换", accent: "hsl(var(--primary))" },
  life: { label: "生活计算", hint: "BMI · 百分比", accent: "var(--cyan-9)" },
  llm: { label: "LLM", hint: "Token 计数", accent: "hsl(var(--primary))" },
  security: { label: "安全", hint: "密码生成", accent: "var(--cyan-9)" },
  text: { label: "文本", hint: "字数 · Diff · 清洗", accent: "hsl(var(--primary))" },
  time: { label: "时间", hint: "时间戳 · 日期间隔", accent: "var(--cyan-9)" },
  unit: { label: "单位", hint: "数据量换算", accent: "hsl(var(--primary))" },
};

export function categoryMeta(id: string): CategoryMeta {
  const m = META[id] ?? {
    label: id,
    hint: "",
    accent: "hsl(var(--primary))",
  };
  return { id, ...m };
}
