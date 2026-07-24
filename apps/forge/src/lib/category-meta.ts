export interface CategoryMeta {
  id: string;
  label: string;
  hint: string;
  accent: string;
}

const META: Record<string, Omit<CategoryMeta, "id">> = {
  codec: { label: "编解码", hint: "Base64 · URL · JWT · Unicode", accent: "hsl(var(--primary))" },
  cn: { label: "国内校验", hint: "身份证 · 手机号", accent: "var(--cyan-9)" },
  data: { label: "数据", hint: "JSON · YAML · CSV · XML", accent: "hsl(var(--primary))" },
  dev: { label: "开发", hint: "正则 · SQL · 颜色 · UUID", accent: "var(--cyan-9)" },
  doc: { label: "文档", hint: "Markdown · PDF 合并拆分", accent: "hsl(var(--primary))" },
  finance: { label: "财务", hint: "金额大写", accent: "var(--cyan-9)" },
  hash: { label: "哈希与安全", hint: "MD5 · SHA · HMAC · 密码", accent: "hsl(var(--primary))" },
  image: { label: "图像", hint: "压缩 · 二维码 · 转换", accent: "var(--cyan-9)" },
  life: { label: "生活计算", hint: "房贷 · BMI · 亲戚称呼", accent: "hsl(var(--primary))" },
  llm: { label: "LLM", hint: "Token · 费用 · Schema", accent: "var(--cyan-9)" },
  security: { label: "安全", hint: "密码生成", accent: "hsl(var(--primary))" },
  text: { label: "文本", hint: "字数 · 简繁 · 拼音 · Diff", accent: "var(--cyan-9)" },
  time: { label: "时间", hint: "时间戳 · 时区 · Cron · 农历", accent: "hsl(var(--primary))" },
  unit: { label: "单位", hint: "长度 · 重量 · 温度 · 数据量", accent: "var(--cyan-9)" },
};

export function categoryMeta(id: string): CategoryMeta {
  const m = META[id] ?? {
    label: id,
    hint: "",
    accent: "hsl(var(--primary))",
  };
  return { id, ...m };
}
