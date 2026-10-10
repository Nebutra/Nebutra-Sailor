/**
 * Generated reference pages. Every fact on these pages is read from the pinned chart source by the
 * readers next to this file; the prose here only frames those facts, in both languages.
 */
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { kebab, REACT_COMPONENT, VUE_COMPONENT, WEB_COMPONENT } from "./components.mjs";
import { docsUrl, slug } from "./import-docs.mjs";
import { frontmatter, hasHan, mdxCode, mdxText, semverCompare } from "./markdown.mjs";
import { groupTools, minimalInput, schemaRows } from "./tools.mjs";

const T = {
  en: {
    toolsTitle: "Tool reference",
    toolsDescription:
      "Every tool the agent can call, generated from the chart's @Tool registry at the pinned commit.",
    groups: {
      panes: ["Panes", "Create, arrange and fill indicator panes."],
      drawings: ["Drawings", "Read, create, copy, update and delete drawings on the chart."],
      comparisons: ["Comparisons", "Overlay other instruments on the main chart."],
      settings: ["Settings", "Read, change and reset chart settings."],
      "market-data": [
        "Market data",
        "Query instruments, bars and time-share data without changing the chart.",
      ],
      indicators: ["Indicators", "Calculate a registered indicator over the loaded data."],
      conversation: ["Conversation", "Ask the user to choose, and search the web."],
      "code-interpreter": [
        "Code interpreter",
        "Run Python in a sandbox. Registered only when the host opts in.",
      ],
    },
    safety: { "read-only": "Read-only", destructive: "Modifies the chart" },
    mode: { parallel: "Runs in parallel", sequential: "Runs in order" },
    origin: {
      core: "Chart core",
      runtime: "Agent runtime",
      "opt-in": "Opt-in",
    },
    tool: "Tool",
    label: "Label",
    access: "Access",
    group: "Group",
    parameters: "Parameters",
    noParameters: "This tool takes no input.",
    name: "Name",
    type: "Type",
    required: "Required",
    constraints: "Constraints",
    description: "Description",
    yes: "Yes",
    no: "—",
    minimal: "Minimal input",
    minimalNote: "Required fields only; placeholders are derived from the schema.",
    schema: "JSON Schema",
    source: "Source",
    generatedNote: (commit, link) =>
      `Generated from the pinned chart source ([\`${commit.slice(0, 7)}\`](${link})). Descriptions are the exact text the model receives.`,
  },
  zh: {
    toolsTitle: "工具参考",
    toolsDescription: "Agent 可调用的全部工具，由固定提交中图表的 @Tool 注册表生成。",
    groups: {
      panes: ["窗格", "创建、排列和填充指标窗格。"],
      drawings: ["画线", "读取、创建、复制、修改和删除图表上的画线。"],
      comparisons: ["对比", "在主图上叠加其他品种。"],
      settings: ["设置", "读取、修改和重置图表设置。"],
      "market-data": ["行情数据", "查询品种、K 线和分时数据，不改变图表。"],
      indicators: ["指标", "在已加载数据上计算已注册的指标。"],
      conversation: ["对话", "请用户做选择，以及联网搜索。"],
      "code-interpreter": ["代码解释器", "在沙箱中运行 Python，仅在宿主显式启用时注册。"],
    },
    safety: { "read-only": "只读", destructive: "修改图表" },
    mode: { parallel: "可并行", sequential: "按序执行" },
    origin: { core: "图表内核", runtime: "Agent 运行时", "opt-in": "可选" },
    tool: "工具",
    label: "名称",
    access: "权限",
    group: "分组",
    parameters: "参数",
    noParameters: "此工具不需要输入。",
    name: "字段",
    type: "类型",
    required: "必填",
    constraints: "约束",
    description: "说明",
    yes: "是",
    no: "—",
    minimal: "最小输入",
    minimalNote: "仅含必填字段，占位值由 schema 推导。",
    schema: "JSON Schema",
    source: "源码",
    generatedNote: (commit, link) =>
      `由固定提交的图表源码生成（[\`${commit.slice(0, 7)}\`](${link})）。工具说明保留模型实际收到的英文原文，不做翻译。`,
  },
};

function page(lang, slugPath, data, body, format = "mdx") {
  return {
    lang,
    slug: slugPath,
    format,
    content: frontmatter({ ...data, generated: true }) + body,
  };
}

function constraintText(constraints) {
  return constraints
    .map(({ kind, value }) => (value ? `${kind} ${mdxCode(value)}` : kind))
    .join("; ");
}

/* ── Agent tools ─────────────────────────────────────────────────────────── */

export function toolPages(tools, { source, links, pin }) {
  const groups = groupTools(tools);
  const out = [];
  const registry = links.blob("packages/core/src/foundation/agent/chartToolRegistry.ts");
  for (const lang of ["en", "zh"]) {
    const t = T[lang];
    const readOnly = tools.filter((tool) => tool.safety === "read-only").length;
    const rows = groups.flatMap((group) =>
      group.tools.map(
        (tool) =>
          `| [${mdxCode(tool.name)}](${docsUrl(lang, `agent/tools/${group.id}`)}#${tool.name}) | ${mdxText(tool.label)} | ${t.safety[tool.safety]} | ${t.groups[group.id][0]} |`,
      ),
    );
    const intro =
      lang === "en"
        ? `The agent operates the chart through **${tools.length} tools**: ${tools.length - readOnly} change the chart, ${readOnly} only read. Chart tools are ordinary chart methods annotated with \`@Tool\`, so the agent and the interface call the same code. A read-only agent session receives only the read-only tools.`
        : `Agent 通过 **${tools.length} 个工具**操作图表：${tools.length - readOnly} 个会修改图表，${readOnly} 个只读。图表工具就是标注了 \`@Tool\` 的普通图表方法，Agent 与界面调用同一份代码。只读会话只会拿到只读工具。`;
    const runtimeNote =
      lang === "en"
        ? "At run time the browser registry appends the live `sourceId` and `paneId` values to the descriptions of the market-data, comparison and drawing tools, so the model only picks values that exist."
        : "运行时，浏览器注册表会把当前可用的 `sourceId` 与 `paneId` 追加到行情、对比和画线工具的说明末尾，模型只能选择真实存在的值。";
    out.push(
      page(
        lang,
        "agent/tools/index",
        { title: t.toolsTitle, description: t.toolsDescription },
        [
          `<Callout>${T[lang].generatedNote(pin.commit, registry)}</Callout>`,
          "",
          intro,
          "",
          runtimeNote,
          "",
          `| ${t.tool} | ${t.label} | ${t.access} | ${t.group} |`,
          "| --- | --- | --- | --- |",
          ...rows,
          "",
          "<Cards>",
          ...groups.map(
            (group) =>
              `  <Card title="${t.groups[group.id][0]}" href="${docsUrl(lang, `agent/tools/${group.id}`)}" description="${t.groups[group.id][1]}" />`,
          ),
          "</Cards>",
          "",
        ].join("\n"),
      ),
    );
    for (const group of groups) {
      const body = [`<Callout>${t.generatedNote(pin.commit, registry)}</Callout>`, ""];
      for (const tool of group.tools) {
        const sourceUrl = `${links.blob(tool.source)}#L${tool.line}`;
        const rowsOf = schemaRows(tool.parameters);
        body.push(`## ${tool.name}`, "");
        body.push(
          `<ToolMeta label="${mdxText(tool.label)}" safety="${tool.safety}" safetyLabel="${t.safety[tool.safety]}" mode="${tool.executionMode ? t.mode[tool.executionMode] : ""}" origin="${t.origin[tool.origin]}" source="${sourceUrl}" sourceLabel="${t.source}" />`,
          "",
        );
        body.push(mdxText(tool.description), "");
        body.push(`**${t.parameters}**`, "");
        if (rowsOf.length === 0) {
          body.push(t.noParameters, "");
        } else {
          body.push(
            `| ${t.name} | ${t.type} | ${t.required} | ${t.constraints} | ${t.description} |`,
            "| --- | --- | --- | --- | --- |",
            ...rowsOf.map(
              (row) =>
                `| ${mdxCode(row.path)} | ${mdxCode(row.type)} | ${row.required ? t.yes : t.no} | ${constraintText(row.constraints) || t.no} | ${row.description ? mdxText(row.description) : ""} |`,
            ),
            "",
          );
          body.push(
            `**${t.minimal}** · ${t.minimalNote}`,
            "",
            "```json",
            JSON.stringify(minimalInput(tool.parameters), null, 2),
            "```",
            "",
          );
        }
        // The full schema loads on demand from /docs/agent-tools.json (it would double the page).
        body.push(`<ToolSchema name="${tool.name}" label="${t.schema}" />`, "");
      }
      out.push(
        page(
          lang,
          `agent/tools/${group.id}`,
          { title: t.groups[group.id][0], description: t.groups[group.id][1] },
          body.join("\n"),
        ),
      );
    }
    out.push({
      lang,
      slug: "agent/tools/meta",
      format: "json",
      content: `${JSON.stringify({ title: t.toolsTitle, pages: ["index", ...groups.map((g) => g.id)] }, null, 2)}\n`,
    });
  }
  return out;
}

/* ── Components ──────────────────────────────────────────────────────────── */

const C = {
  en: {
    vueTitle: "Vue component",
    vueDescription: "Props, events and slots of <KlineChart>, generated from KLineChart.vue.",
    reactTitle: "React component",
    reactDescription: "Props of <KLineChartWC>, generated from the React wrapper.",
    wcTitle: "Web Component",
    wcDescription: "The <kline-chart> custom element: attributes, properties and events.",
    props: "Props",
    events: "Events",
    slots: "Slots",
    prop: "Prop",
    default: "Default",
    event: "Event",
    payload: "Payload",
    slot: "Slot",
    slotProps: "Scope",
    attribute: "Attribute",
    property: "Property",
    sourceText: "source comment, Chinese",
    generated: (link) => `Generated from [\`${link.label}\`](${link.href}) at the pinned commit.`,
  },
  zh: {
    vueTitle: "Vue 组件",
    vueDescription: "<KlineChart> 的属性、事件与插槽，由 KLineChart.vue 生成。",
    reactTitle: "React 组件",
    reactDescription: "<KLineChartWC> 的属性，由 React 封装生成。",
    wcTitle: "Web Component",
    wcDescription: "<kline-chart> 自定义元素：attribute、property 与事件。",
    props: "属性",
    events: "事件",
    slots: "插槽",
    prop: "属性",
    default: "默认值",
    event: "事件",
    payload: "参数",
    slot: "插槽",
    slotProps: "作用域",
    attribute: "Attribute",
    property: "Property",
    sourceText: "",
    generated: (link) => `由固定提交的 [\`${link.label}\`](${link.href}) 生成。`,
  },
};

function describe(kind, name, sourceDescription, lang, descriptions, missing) {
  const entry = descriptions[kind]?.[name] ?? {};
  if (lang === "zh") return sourceDescription || entry.zh || entry.en || "";
  if (entry.en) return entry.en;
  if (sourceDescription) missing.push(`${kind}.${name}`);
  return sourceDescription ? `${sourceDescription} (${C.en.sourceText})` : "";
}

const PRIMITIVE = /^(number|boolean|string|'[^']*'( \| '[^']*')*)$/;

export function componentPages(vue, react, wc, { links, descriptions }) {
  const out = [];
  const missing = [];
  for (const lang of ["en", "zh"]) {
    const c = C[lang];
    const vueBody = [
      `<Callout>${c.generated({ label: VUE_COMPONENT, href: links.blob(VUE_COMPONENT) })}</Callout>`,
      "",
      `## ${c.props}`,
      "",
      `| ${c.prop} | ${T[lang].type} | ${c.default} | ${T[lang].description} |`,
      "| --- | --- | --- | --- |",
      ...vue.props.map(
        (p) =>
          `| ${mdxCode(kebab(p.name))} | ${mdxCode(p.type)} | ${p.default && p.default !== "undefined" ? mdxCode(p.default) : "—"} | ${mdxText(describe("props", p.name, p.sourceDescription, lang, descriptions, missing))} |`,
      ),
      "",
      `## ${c.events}`,
      "",
      `| ${c.event} | ${c.payload} | ${T[lang].description} |`,
      "| --- | --- | --- |",
      ...vue.events.map(
        (e) =>
          `| ${mdxCode(`@${kebab(e.name)}`)} | ${e.args.length ? mdxCode(e.args.map((a) => `${a.name}: ${a.type}`).join(", ")) : "—"} | ${mdxText(describe("events", e.name, "", lang, descriptions, missing))} |`,
      ),
      "",
      `## ${c.slots}`,
      "",
      `| ${c.slot} | ${c.slotProps} | ${T[lang].description} |`,
      "| --- | --- | --- |",
      ...vue.slots.map(
        (s) =>
          `| ${mdxCode(`#${s.name}`)} | ${s.props ? mdxCode(s.props) : "—"} | ${mdxText(describe("slots", s.name, s.sourceDescription, lang, descriptions, missing))} |`,
      ),
      "",
    ];
    out.push(
      page(
        lang,
        "reference/vue",
        { title: c.vueTitle, description: c.vueDescription },
        vueBody.join("\n"),
      ),
    );

    const vueByName = new Map(vue.props.map((p) => [p.name, p]));
    const reactBody = [
      `<Callout>${c.generated({ label: REACT_COMPONENT, href: links.blob(REACT_COMPONENT) })}</Callout>`,
      "",
      lang === "en"
        ? `\`KLineChartWC\` renders the \`<${wc.tag}>\` custom element and registers it on the client. It forwards the props below as attributes and listens for the two events; other Vue props are not exposed.`
        : `\`KLineChartWC\` 渲染 \`<${wc.tag}>\` 自定义元素并在客户端注册。它把下列属性同步为 attribute，并监听两个事件；其余 Vue 属性未暴露。`,
      "",
      `## ${c.props}`,
      "",
      `| ${c.prop} | ${T[lang].type} | ${c.attribute} | ${T[lang].description} |`,
      "| --- | --- | --- | --- |",
      ...react.props.map((p) => {
        const attribute = react.attributes.find((a) => a.prop === p.name)?.attribute;
        const vueProp = vueByName.get(p.name);
        let text = vueProp
          ? describe("props", p.name, vueProp.sourceDescription, lang, descriptions, [])
          : "";
        if (p.name === "onZoomLevelChange")
          text =
            lang === "en"
              ? "Listens for `zoom-level-change`. Receives the event's `detail`, which Vue dispatches as the emit arguments `[level, kWidth]`."
              : "监听 `zoom-level-change`，回调收到事件的 `detail`；Vue 派发的是 emit 参数数组 `[level, kWidth]`。";
        if (p.name === "onToggleFullscreen")
          text = lang === "en" ? "Listens for `toggle-fullscreen`." : "监听 `toggle-fullscreen`。";
        if (p.name === "style" || p.name === "className")
          text = lang === "en" ? "Applied to the host element." : "作用于宿主元素。";
        return `| ${mdxCode(p.name)} | ${mdxCode(p.type)} | ${attribute ? mdxCode(attribute) : "—"} | ${mdxText(text)} |`;
      }),
      "",
    ];
    out.push(
      page(
        lang,
        "reference/react",
        { title: c.reactTitle, description: c.reactDescription },
        reactBody.join("\n"),
      ),
    );

    const wcBody = [
      `<Callout>${c.generated({ label: WEB_COMPONENT, href: links.blob(WEB_COMPONENT) })}</Callout>`,
      "",
      lang === "en"
        ? `The element is \`<${wc.tag}>\`, built with Vue's \`defineCustomElement\`${wc.shadowRoot ? " and rendered in a shadow root" : ""}. Primitive props are reflected as kebab-case attributes; arrays and objects must be set as JavaScript properties. Events are \`CustomEvent\`s whose \`detail\` is the array of emit arguments; each is dispatched under its camelCase and kebab-case name.`
        : `元素为 \`<${wc.tag}>\`，由 Vue 的 \`defineCustomElement\` 构建${wc.shadowRoot ? "，渲染在 shadow root 中" : ""}。原始类型属性对应 kebab-case attribute；数组与对象必须以 JavaScript property 赋值。事件为 \`CustomEvent\`，\`detail\` 是 emit 参数数组，并以 camelCase 与 kebab-case 两个名字各派发一次。`,
      "",
      `## ${c.props}`,
      "",
      `| ${c.attribute} | ${c.property} | ${T[lang].type} | ${c.default} |`,
      "| --- | --- | --- | --- |",
      ...vue.props.map(
        (p) =>
          `| ${PRIMITIVE.test(p.type) ? mdxCode(kebab(p.name)) : "—"} | ${mdxCode(p.name)} | ${mdxCode(p.type)} | ${p.default && p.default !== "undefined" ? mdxCode(p.default) : "—"} |`,
      ),
      "",
      `## ${c.events}`,
      "",
      `| ${c.event} | \`detail\` |`,
      "| --- | --- |",
      ...vue.events.map(
        (e) =>
          `| ${mdxCode(kebab(e.name).replace(/^update:/, "update:"))} | ${e.args.length ? mdxCode(`[${e.args.map((a) => `${a.name}: ${a.type}`).join(", ")}]`) : "`[]`"} |`,
      ),
      "",
    ];
    out.push(
      page(
        lang,
        "reference/web-component",
        { title: c.wcTitle, description: c.wcDescription },
        wcBody.join("\n"),
      ),
    );
  }
  return { pages: out, missing: [...new Set(missing)] };
}

/* ── Packages ────────────────────────────────────────────────────────────── */

const PACKAGES = [
  "packages/core",
  "packages/vue",
  "packages/react",
  "packages/angular",
  "packages/agent-runtime",
  "packages/ui-schema",
];

export function packagePages(source, { links }) {
  const rows = [];
  for (const dir of PACKAGES) {
    let manifest;
    try {
      manifest = JSON.parse(readFileSync(resolve(source, dir, "package.json"), "utf8"));
    } catch {
      continue;
    }
    if (manifest.private) continue;
    rows.push({
      name: manifest.name,
      version: manifest.version,
      description: manifest.description ?? "",
      entries: Object.keys(manifest.exports ?? {}).filter((k) => k !== "./package.json"),
      dir,
    });
  }
  const out = [];
  for (const lang of ["en", "zh"]) {
    const en = lang === "en";
    const body = [
      en
        ? "Published packages and their entry points, read from each `package.json` at the pinned commit."
        : "已发布的包及其入口，读取自固定提交中各包的 `package.json`。",
      "",
    ];
    for (const pkg of rows) {
      body.push(`## ${pkg.name}`, "");
      body.push(
        `<PackageMeta version="${pkg.version}" npm="https://www.npmjs.com/package/${pkg.name}" source="${links.tree(pkg.dir)}" />`,
        "",
      );
      if (pkg.description) body.push(mdxText(pkg.description), "");
      body.push("```bash", `pnpm add ${pkg.name}`, "```", "");
      if (pkg.entries.length) {
        body.push(
          `| ${en ? "Entry point" : "入口"} | ${en ? "Import" : "导入路径"} |`,
          "| --- | --- |",
          ...pkg.entries.map(
            (entry) =>
              `| ${mdxCode(entry)} | ${mdxCode(entry === "." ? pkg.name : `${pkg.name}/${entry.slice(2)}`)} |`,
          ),
          "",
        );
      }
    }
    out.push(
      page(
        lang,
        "reference/packages",
        {
          title: en ? "Packages" : "包与入口",
          description: en ? "npm packages and entry points." : "npm 包与入口。",
        },
        body.join("\n"),
      ),
    );
  }
  return out;
}

/* ── Live bars SSE contract ──────────────────────────────────────────────── */

const LIVE_TYPES = "packages/core/src/data/live/types.ts";
const PROTOCOL = "packages/core/src/data/provider/protocol/types.ts";

export function readLiveContract(source) {
  const code = readFileSync(resolve(source, LIVE_TYPES), "utf8");
  const sf = ts.createSourceFile("types.ts", code, ts.ScriptTarget.Latest, true);
  const text = (n) => n.getText(sf).replace(/\s+/g, " ").trim();
  const find = (name) =>
    sf.statements.find(
      (s) => (ts.isTypeAliasDeclaration(s) || ts.isInterfaceDeclaration(s)) && s.name.text === name,
    );
  const frameAlias = find("LiveBarsFrame");
  if (!frameAlias || !ts.isUnionTypeNode(frameAlias.type))
    throw new Error("LiveBarsFrame union missing");
  const frames = frameAlias.type.types.map((member) => {
    const fields = member.members.filter(ts.isPropertySignature).map((m) => ({
      name: text(m.name),
      type: m.type ? text(m.type) : "unknown",
      optional: Boolean(m.questionToken),
    }));
    const type = fields.find((f) => f.name === "type")?.type.replace(/'/g, "");
    return { type, fields: fields.filter((f) => f.name !== "type") };
  });
  const bar = find("LiveBar")
    .members.filter(ts.isPropertySignature)
    .map((m) => ({
      name: text(m.name),
      type: m.type ? text(m.type) : "unknown",
      optional: Boolean(m.questionToken),
    }));
  const status = text(find("LiveBarsStatus").type).replace(/'/g, "").split(" | ");
  const request = find("LiveBarsRequest")
    .members.filter(ts.isPropertySignature)
    .map((m) => ({
      name: text(m.name),
      optional: Boolean(m.questionToken),
    }));
  const protocol = readFileSync(resolve(source, PROTOCOL), "utf8");
  const base = protocol.match(/const V1_API_BASE = '([^']+)'/)?.[1];
  if (!base) throw new Error("V1_API_BASE missing");
  return { frames, bar, status, request, endpoint: `${base}/sources/{sourceId}/stream` };
}

const FRAME_TEXT = {
  snapshot: {
    en: "The full tail of the series. Sent first and after a reconnect; the chart writes it in one batch and drops any pending closed bar.",
    zh: "序列尾部全量。首帧和重连后发送；图表整批写入，并清空暂存的收线。",
  },
  forming: {
    en: "The bar that is still forming. Written together with a pending closed bar as one atomic update.",
    zh: "正在形成的 K 线。与暂存的收线合并为一次原子写入。",
  },
  closed: {
    en: "A bar's final values. Held until the next forming bar arrives (or the stream stops), then written with it.",
    zh: "某根 K 线的终值。暂存到下一根 forming 到达（或断流）时一起写入。",
  },
  status: {
    en: "Connector state for the subscription, with optional detail. It does not change bars.",
    zh: "该订阅的连接器状态，可附 detail，不修改 K 线。",
  },
};

export function liveBarsPages(contract, { links }) {
  const out = [];
  for (const lang of ["en", "zh"]) {
    const en = lang === "en";
    const body = [
      `<Callout>${en ? "Generated from" : "生成自"} [\`${LIVE_TYPES}\`](${links.blob(LIVE_TYPES)}) ${en ? "and" : "与"} [\`barsLive.ts\`](${links.blob("packages/core/src/data/live/impl/barsLive.ts")}).</Callout>`,
      "",
      en
        ? "A connector streams live K-lines to the chart over Server-Sent Events. One connection carries one series: a source, a symbol, a period and a bar aggregation. Changing any of them closes the stream and opens a new one."
        : "连接器通过 Server-Sent Events 向图表推送实时 K 线。一条连接只承载一个序列：数据源、代码、周期与 K 线聚合方式。任一维度变化都会关闭旧流、建立新流。",
      "",
      "## Endpoint",
      "",
      "```http",
      `GET ${contract.endpoint}?${contract.request.map((f) => `${f.name}=…`).join("&")}`,
      "Accept: text/event-stream",
      "```",
      "",
      `| ${en ? "Query" : "查询参数"} | ${en ? "Required" : "必填"} |`,
      "| --- | --- |",
      ...contract.request.map(
        (f) => `| ${mdxCode(f.name)} | ${f.optional ? "—" : en ? "Yes" : "是"} |`,
      ),
      "",
      en
        ? "`instrumentId` is the resolved instrument's stable id. It is sent only when known, so a bare code that exists on two exchanges still reaches the right one."
        : "`instrumentId` 是已解析品种的稳定 id，仅在已知时发送，用于区分在两个交易所同名的裸代码。",
      "",
      `## ${en ? "Frames" : "帧"}`,
      "",
      en
        ? "Each SSE `data:` line is one JSON frame. Comment lines (`:` keep-alives) and empty data are ignored."
        : "每个 SSE `data:` 行是一个 JSON 帧。注释行（`:` 心跳）和空数据会被忽略。",
      "",
      `| \`type\` | ${en ? "Fields" : "字段"} | ${en ? "Meaning" : "含义"} |`,
      "| --- | --- | --- |",
      ...contract.frames.map(
        (frame) =>
          `| ${mdxCode(frame.type)} | ${frame.fields.map((f) => mdxCode(`${f.name}${f.optional ? "?" : ""}: ${f.type}`)).join(" ")} | ${FRAME_TEXT[frame.type]?.[lang] ?? ""} |`,
      ),
      "",
      `### LiveBar`,
      "",
      `| ${en ? "Field" : "字段"} | ${en ? "Type" : "类型"} | ${en ? "Required" : "必填"} |`,
      "| --- | --- | --- |",
      ...contract.bar.map(
        (f) =>
          `| ${mdxCode(f.name)} | ${mdxCode(f.type)} | ${f.optional ? "—" : en ? "Yes" : "是"} |`,
      ),
      "",
      en
        ? "`timestamp` is UTC milliseconds. Missing `volume` and `turnover` are written as 0."
        : "`timestamp` 为 UTC 毫秒。缺省的 `volume` 与 `turnover` 写为 0。",
      "",
      "```text",
      'data: {"type":"snapshot","symbol":"600519","period":"1min","bars":[…]}',
      "",
      'data: {"type":"forming","symbol":"600519","period":"1min","bar":{"timestamp":…,"open":…,"high":…,"low":…,"close":…}}',
      "",
      'data: {"type":"closed","symbol":"600519","period":"1min","bar":{…}}',
      "```",
      "",
      `## ${en ? "Connection state" : "连接状态"}`,
      "",
      en
        ? `The stream reports ${contract.status.map((s) => `\`${s}\``).join(", ")}. The browser's EventSource reconnects on its own; a connector can replay missed frames from \`Last-Event-ID\`.`
        : `流会报告 ${contract.status.map((s) => `\`${s}\``).join("、")}。浏览器的 EventSource 会自动重连；连接器可凭 \`Last-Event-ID\` 补发错过的帧。`,
      "",
    ];
    out.push(
      page(
        lang,
        "market-data/live-bars",
        {
          title: en ? "Live bars (SSE)" : "实时 K 线（SSE）",
          description: en
            ? "The Server-Sent Events contract for live K-lines: snapshot, forming, closed and status frames."
            : "实时 K 线的 SSE 契约：snapshot、forming、closed 与 status 帧。",
        },
        body.join("\n"),
      ),
    );
  }
  return out;
}

/* ── HTTP API (OpenAPI) ──────────────────────────────────────────────────── */

const OPENAPI = "docs/market-data/market-data-v1.openapi.yaml";

export async function httpApiPages(source, { links }) {
  const { parse } = await import("yaml");
  const spec = parse(readFileSync(resolve(source, OPENAPI), "utf8"));
  const ref = (node) => {
    let value = node;
    while (value?.$ref) {
      value = value.$ref
        .replace(/^#\//, "")
        .split("/")
        .reduce((acc, key) => acc?.[key], spec);
    }
    return value;
  };
  const schemaName = (node) => node?.$ref?.split("/").at(-1) ?? node?.type ?? "";
  const operations = [];
  for (const [path, methods] of Object.entries(spec.paths ?? {})) {
    for (const [method, op] of Object.entries(methods)) {
      operations.push({ path, method: method.toUpperCase(), op });
    }
  }
  const out = [];
  for (const lang of ["en", "zh"]) {
    const en = lang === "en";
    const body = [
      `<Callout>${en ? "Generated from" : "生成自"} [\`${OPENAPI}\`](${links.blob(OPENAPI)}) (OpenAPI ${spec.openapi}).${en ? " Summaries and descriptions are quoted from the specification, which is written in Chinese." : ""}</Callout>`,
      "",
      en
        ? "Connectors implement this REST protocol; the chart's provider router calls it. Responses are wrapped in `{ data, requestId }`, errors in `{ error }`."
        : "连接器实现这套 REST 协议，图表的 Provider 路由调用它。成功响应包在 `{ data, requestId }` 中，错误为 `{ error }`。",
      "",
    ];
    for (const { path, method, op } of operations) {
      body.push(`## ${mdxText(op.summary ?? op.operationId)}`, "");
      body.push(`<Endpoint method="${method}" path="${path}" />`, "");
      if (op.description) body.push(mdxText(op.description.trim()), "");
      const params = (op.parameters ?? []).map(ref);
      if (params.length) {
        body.push(
          `| ${en ? "Parameter" : "参数"} | ${en ? "In" : "位置"} | ${en ? "Type" : "类型"} | ${en ? "Required" : "必填"} |`,
          "| --- | --- | --- | --- |",
          ...params.map(
            (p) =>
              `| ${mdxCode(p.name)} | ${p.in} | ${mdxCode(schemaName(p.schema))} | ${p.required ? (en ? "Yes" : "是") : "—"} |`,
          ),
          "",
        );
      }
      const requestSchema = op.requestBody?.content?.["application/json"]?.schema;
      if (requestSchema)
        body.push(`${en ? "Request body" : "请求体"}: ${mdxCode(schemaName(requestSchema))}`, "");
      const responses = Object.entries(op.responses ?? {}).map(([code, response]) => {
        const resolved = ref(response);
        const content = resolved?.content ?? {};
        const [type, media] = Object.entries(content)[0] ?? [];
        return `| ${mdxCode(code)} | ${type ? mdxCode(type) : "—"} | ${media?.schema ? mdxCode(schemaName(media.schema)) : "—"} | ${mdxText(resolved?.description ?? "")} |`;
      });
      body.push(
        `| ${en ? "Status" : "状态码"} | ${en ? "Media type" : "媒体类型"} | Schema | ${en ? "Description" : "说明"} |`,
        "| --- | --- | --- | --- |",
        ...responses,
        "",
      );
    }
    out.push(
      page(
        lang,
        "market-data/http-api",
        {
          title: en ? "HTTP API" : "HTTP 接口",
          description: en
            ? "The market-data REST protocol connectors implement, generated from its OpenAPI specification."
            : "连接器实现的行情 REST 协议，由 OpenAPI 规范生成。",
        },
        body.join("\n"),
      ),
    );
  }
  return out;
}

/* ── Changelog ───────────────────────────────────────────────────────────── */

const EMOJI = /(?:\p{Extended_Pictographic}|\u{FE0F}|\u{200D})+/gu;

/** Split a bilingual release note (each Chinese line followed by its English twin) per language. */
export function splitRelease(markdown) {
  const out = { en: [], zh: [] };
  for (const rawLine of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const line = rawLine.replace(EMOJI, "").replace(/^(#+)\s+/, "$1 ");
    if (/^#\s/.test(line)) continue;
    const heading = line.match(/^(#{2,6})\s+(.+)$/);
    if (heading) {
      const [zh, en] = heading[2].split(/\s+\/\s+/);
      const level = heading[1].length === 2 ? "##" : "###";
      if (en) {
        out.zh.push(`${level} ${zh.trim()}`);
        out.en.push(`${level} ${en.trim()}`);
      } else {
        (hasHan(heading[2]) ? out.zh : out.en).push(`${level} ${heading[2].trim()}`);
        if (!hasHan(heading[2])) out.zh.push(`${level} ${heading[2].trim()}`);
      }
      continue;
    }
    if (line.trim() === "") {
      out.en.push("");
      out.zh.push("");
      continue;
    }
    (hasHan(line.replace(/`[^`]*`/g, "")) ? out.zh : out.en).push(line);
  }
  const tidy = (lines) =>
    lines
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  return { en: tidy(out.en), zh: tidy(out.zh) };
}

export function changelogPages(source, { links }) {
  const dir = resolve(source, "docs/release");
  const versions = globRelease(dir).sort((a, b) => semverCompare(b.version, a.version));
  const out = [];
  for (const lang of ["en", "zh"]) {
    const en = lang === "en";
    const pages = [];
    for (const release of versions) {
      const split = splitRelease(release.text);
      const body = split[lang] || split.en;
      const lead = body.match(/^##\s+(.+)$/m)?.[1] ?? release.version;
      const slugPath = `changelog/${slug(release.version)}`;
      pages.push({ ...release, slug: slugPath, lead });
      out.push({
        lang,
        slug: slugPath,
        format: "md",
        content:
          frontmatter({
            title: release.version,
            description: lead,
            sourcePath: release.file,
            generated: true,
          }) +
          body.replace(/^##\s+.+\n+/, "") +
          "\n",
      });
    }
    const list = pages.map(
      (p) => `| [${p.version}](${docsUrl(lang, p.slug)}) | ${mdxText(p.lead)} |`,
    );
    out.push(
      page(
        lang,
        "changelog/index",
        {
          title: en ? "Changelog" : "更新日志",
          description: en
            ? "Release notes for every published version of the chart library."
            : "图表库每个发布版本的更新说明。",
        },
        [
          en
            ? `Release notes come from [\`docs/release\`](${links.tree("docs/release")}) at the pinned commit. Newest first.`
            : `更新说明来自固定提交中的 [\`docs/release\`](${links.tree("docs/release")})，最新版本在前。`,
          "",
          `| ${en ? "Version" : "版本"} | ${en ? "Scope" : "范围"} |`,
          "| --- | --- |",
          ...list,
          "",
        ].join("\n"),
      ),
    );
    out.push({
      lang,
      slug: "changelog/meta",
      format: "json",
      content: `${JSON.stringify({ title: en ? "Changelog" : "更新日志", pages: ["index", ...pages.map((p) => p.slug.split("/")[1])] }, null, 2)}\n`,
    });
  }
  return out;
}

function globRelease(dir) {
  return readdirSync(dir)
    .filter((f) => /^v\d+\.\d+\.\d+.*\.md$/.test(f))
    .map((f) => ({
      version: f.replace(/\.md$/, ""),
      file: `docs/release/${f}`,
      text: readFileSync(resolve(dir, f), "utf8"),
    }));
}
