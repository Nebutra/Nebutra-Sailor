/**
 * Rendering notices for each channel, in the subscriber's language. Pure: a
 * notice in, the channel's JSON (or an email) out. Signatures are added at
 * send time, never stored.
 *
 * The card shapes follow @nebutra/status's notify.ts (Feishu interactive
 * card, Slack blocks), extended with DingTalk and WeCom markdown.
 */

export type NoticeEvent =
  | "incident.created"
  | "incident.updated"
  | "maintenance.started"
  | "component.changed"
  | "subscription.confirm"
  | "subscription.welcome";

export type Channel = "email" | "webhook" | "feishu" | "dingtalk" | "wecom" | "slack";
export type Lang = "zh" | "en";

export interface Notice {
  event: NoticeEvent;
  page: { slug: string; title: string; url: string };
  /** Incidents and maintenance. */
  incident?: {
    id: string;
    kind: "incident" | "maintenance";
    title: string;
    impact: "none" | "minor" | "major" | "critical";
    status: "investigating" | "identified" | "monitoring" | "resolved";
    message: string;
    scheduledStart: string | null;
    scheduledEnd: string | null;
    components: string[];
    url: string;
    updatedAt: string;
  };
  /** Component state changes. */
  component?: { key: string; name: string; from: string; to: string; checkedAt: string | null };
  /** Email confirmation. */
  confirmUrl?: string;
  /** The unsubscribe page people click through to. */
  unsubscribeUrl: string;
  /** RFC 8058 one-click target for mail clients (List-Unsubscribe); defaults to unsubscribeUrl. */
  oneClickUrl?: string;
}

export interface EmailMessage {
  subject: string;
  text: string;
  html: string;
}

export type RenderedPayload =
  | { channel: "email"; email: EmailMessage; unsubscribeUrl: string }
  | { channel: Exclude<Channel, "email">; body: Record<string, unknown> };

export function langOf(locale: string | null | undefined): Lang {
  return locale?.toLowerCase().startsWith("zh") ? "zh" : "en";
}

const T = {
  zh: {
    new: "新事故",
    update: "事故更新",
    resolved: "已解决",
    scheduled: "计划维护",
    maintenanceUpdate: "维护更新",
    maintenanceStarted: "维护开始",
    maintenanceDone: "维护完成",
    componentChanged: "状态变化",
    confirmSubject: "请确认订阅",
    welcome: "订阅成功",
    status: "状态",
    impact: "影响",
    window: "时间窗口",
    affects: "影响组件",
    view: "查看状态页",
    unsubscribe: "退订",
    confirm: "确认订阅",
    confirmBody: (page: string) =>
      `你（或其他人）用这个地址订阅了「${page}」的状态通知。点击下面的链接确认；如果不是你本人操作，忽略这封邮件即可。`,
    welcomeBody: (page: string) => `此后「${page}」的事故与维护通知会发到这里。`,
    componentBody: (name: string, from: string, to: string) => `${name}：${from} → ${to}`,
    statuses: {
      investigating: "调查中",
      identified: "已定位",
      monitoring: "观察中",
      resolved: "已解决",
    } as Record<string, string>,
    impacts: { none: "无影响", minor: "轻微", major: "严重", critical: "重大" } as Record<
      string,
      string
    >,
    states: {
      operational: "正常",
      degraded: "性能下降",
      outage: "中断",
      maintenance: "维护中",
      unknown: "未知",
    } as Record<string, string>,
  },
  en: {
    new: "New incident",
    update: "Incident update",
    resolved: "Resolved",
    scheduled: "Scheduled maintenance",
    maintenanceUpdate: "Maintenance update",
    maintenanceStarted: "Maintenance started",
    maintenanceDone: "Maintenance completed",
    componentChanged: "Status change",
    confirmSubject: "Confirm your subscription",
    welcome: "Subscribed",
    status: "Status",
    impact: "Impact",
    window: "Window",
    affects: "Affects",
    view: "View on status page",
    unsubscribe: "Unsubscribe",
    confirm: "Confirm subscription",
    confirmBody: (page: string) =>
      `You (or someone using this address) subscribed to status notifications for ${page}. Confirm with the link below; if this wasn't you, ignore this email.`,
    welcomeBody: (page: string) =>
      `Incident and maintenance notifications for ${page} will be posted here.`,
    componentBody: (name: string, from: string, to: string) => `${name}: ${from} → ${to}`,
    statuses: {
      investigating: "Investigating",
      identified: "Identified",
      monitoring: "Monitoring",
      resolved: "Resolved",
    } as Record<string, string>,
    impacts: { none: "None", minor: "Minor", major: "Major", critical: "Critical" } as Record<
      string,
      string
    >,
    states: {
      operational: "Operational",
      degraded: "Degraded",
      outage: "Outage",
      maintenance: "Maintenance",
      unknown: "Unknown",
    } as Record<string, string>,
  },
};

const FEISHU_TEMPLATE: Record<string, string> = {
  none: "grey",
  minor: "yellow",
  major: "orange",
  critical: "red",
};

interface Parts {
  headline: string;
  color: string;
  fields: Array<[string, string]>;
  body: string;
  link: { label: string; url: string } | null;
}

function formatWindow(start: string | null, end: string | null): string | null {
  if (!start || !end) return null;
  const fmt = (iso: string) => `${iso.slice(0, 16).replace("T", " ")} UTC`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function parts(n: Notice, lang: Lang): Parts {
  const t = T[lang];
  if (n.event === "subscription.confirm") {
    return {
      headline: `${t.confirmSubject} · ${n.page.title}`,
      color: "blue",
      fields: [],
      body: t.confirmBody(n.page.title),
      link: n.confirmUrl ? { label: t.confirm, url: n.confirmUrl } : null,
    };
  }
  if (n.event === "subscription.welcome") {
    return {
      headline: `${t.welcome} · ${n.page.title}`,
      color: "blue",
      fields: [],
      body: t.welcomeBody(n.page.title),
      link: { label: t.view, url: n.page.url },
    };
  }
  if (n.event === "component.changed" && n.component) {
    const c = n.component;
    const to = t.states[c.to] ?? c.to;
    return {
      headline: `[${t.componentChanged}] ${c.name} · ${to}`,
      color: c.to === "operational" ? "green" : c.to === "outage" ? "red" : "yellow",
      fields: [],
      body: t.componentBody(c.name, t.states[c.from] ?? c.from, to),
      link: { label: t.view, url: n.page.url },
    };
  }
  const i = n.incident;
  if (!i) throw new Error(`Notice ${n.event} has no incident`);
  const maintenance = i.kind === "maintenance";
  const label =
    n.event === "maintenance.started"
      ? t.maintenanceStarted
      : i.status === "resolved"
        ? maintenance
          ? t.maintenanceDone
          : t.resolved
        : n.event === "incident.created"
          ? maintenance
            ? t.scheduled
            : t.new
          : maintenance
            ? t.maintenanceUpdate
            : t.update;
  const fields: Array<[string, string]> = [];
  const window = maintenance ? formatWindow(i.scheduledStart, i.scheduledEnd) : null;
  if (window) fields.push([t.window, window]);
  else {
    fields.push([t.status, t.statuses[i.status] ?? i.status]);
    fields.push([t.impact, t.impacts[i.impact] ?? i.impact]);
  }
  if (i.components.length > 0) fields.push([t.affects, i.components.join(", ")]);
  return {
    headline: `[${label}] ${i.title}`,
    color:
      i.status === "resolved"
        ? "green"
        : maintenance
          ? "blue"
          : (FEISHU_TEMPLATE[i.impact] ?? "yellow"),
    fields,
    body: i.message,
    link: { label: t.view, url: i.url },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function feishu(p: Parts, n: Notice, lang: Lang) {
  return {
    msg_type: "interactive",
    card: {
      config: { wide_screen_mode: true },
      header: { template: p.color, title: { tag: "plain_text", content: p.headline } },
      elements: [
        ...(p.fields.length > 0
          ? [
              {
                tag: "div",
                fields: p.fields.map(([k, v]) => ({
                  is_short: true,
                  text: { tag: "lark_md", content: `**${k}**\n${v}` },
                })),
              },
            ]
          : []),
        { tag: "div", text: { tag: "plain_text", content: p.body } },
        {
          tag: "action",
          actions: [
            ...(p.link
              ? [
                  {
                    tag: "button",
                    text: { tag: "plain_text", content: p.link.label },
                    type: "primary",
                    url: p.link.url,
                  },
                ]
              : []),
            {
              tag: "button",
              text: { tag: "plain_text", content: T[lang].unsubscribe },
              type: "default",
              url: n.unsubscribeUrl,
            },
          ],
        },
      ],
    },
  };
}

function markdownLines(p: Parts, n: Notice, lang: Lang, wecom: boolean): string {
  const lines = [`### ${p.headline}`];
  for (const [k, v] of p.fields) lines.push(`**${k}**: ${v}`);
  lines.push("", p.body, "");
  if (p.link) lines.push(`[${p.link.label}](${p.link.url})`);
  // WeCom markdown renders <font>; DingTalk ignores it, so keep it WeCom-only.
  const unsub = `[${T[lang].unsubscribe}](${n.unsubscribeUrl})`;
  lines.push(wecom ? `<font color="comment">${unsub}</font>` : unsub);
  return lines.join("\n");
}

function slack(p: Parts, n: Notice, lang: Lang) {
  return {
    text: p.headline,
    blocks: [
      { type: "header", text: { type: "plain_text", text: p.headline.slice(0, 150) } },
      ...(p.fields.length > 0
        ? [
            {
              type: "section",
              fields: p.fields.map(([k, v]) => ({ type: "mrkdwn", text: `*${k}*\n${v}` })),
            },
          ]
        : []),
      { type: "section", text: { type: "plain_text", text: p.body } },
      {
        type: "actions",
        elements: [
          ...(p.link
            ? [
                {
                  type: "button",
                  text: { type: "plain_text", text: p.link.label },
                  url: p.link.url,
                },
              ]
            : []),
          {
            type: "button",
            text: { type: "plain_text", text: T[lang].unsubscribe },
            url: n.unsubscribeUrl,
          },
        ],
      },
    ],
  };
}

function email(p: Parts, n: Notice, lang: Lang): EmailMessage {
  const t = T[lang];
  const text = [
    p.headline,
    "",
    ...p.fields.map(([k, v]) => `${k}: ${v}`),
    ...(p.fields.length > 0 ? [""] : []),
    p.body,
    "",
    ...(p.link ? [`${p.link.label}: ${p.link.url}`] : []),
    "",
    `${t.unsubscribe}: ${n.unsubscribeUrl}`,
  ].join("\n");
  const html = `<!doctype html><html lang="${lang === "zh" ? "zh-CN" : "en"}"><body style="font-family:system-ui,-apple-system,sans-serif;color:#18191c;line-height:1.5;max-width:560px;margin:0 auto;padding:24px">
<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(p.headline)}</h2>
${p.fields.map(([k, v]) => `<p style="margin:0;color:#4b4d52"><strong>${escapeHtml(k)}</strong> ${escapeHtml(v)}</p>`).join("\n")}
<p style="white-space:pre-wrap">${escapeHtml(p.body)}</p>
${p.link ? `<p><a href="${escapeHtml(p.link.url)}" style="color:#2e65ee">${escapeHtml(p.link.label)}</a></p>` : ""}
<p style="margin-top:32px;font-size:12px;color:#717377"><a href="${escapeHtml(n.unsubscribeUrl)}" style="color:#717377">${escapeHtml(t.unsubscribe)}</a></p>
</body></html>`;
  const subject =
    n.event === "subscription.confirm" ? p.headline : `${n.page.title} · ${p.headline}`;
  return { subject, text, html };
}

function webhook(n: Notice) {
  return {
    version: 1,
    event: n.event,
    page: n.page,
    ...(n.incident ? { incident: n.incident } : {}),
    ...(n.component ? { component: n.component } : {}),
    unsubscribeUrl: n.unsubscribeUrl,
  };
}

export function render(n: Notice, channel: Channel, locale: string | null): RenderedPayload {
  const lang = langOf(locale);
  const p = parts(n, lang);
  switch (channel) {
    case "email":
      return {
        channel,
        email: email(p, n, lang),
        unsubscribeUrl: n.oneClickUrl ?? n.unsubscribeUrl,
      };
    case "feishu":
      return { channel, body: feishu(p, n, lang) };
    case "dingtalk":
      return {
        channel,
        body: {
          msgtype: "markdown",
          markdown: { title: p.headline, text: markdownLines(p, n, lang, false) },
        },
      };
    case "wecom":
      return {
        channel,
        body: { msgtype: "markdown", markdown: { content: markdownLines(p, n, lang, true) } },
      };
    case "slack":
      return { channel, body: slack(p, n, lang) };
    case "webhook":
      return { channel, body: webhook(n) };
  }
}
