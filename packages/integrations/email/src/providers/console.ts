/**
 * Console email provider — prints email details to stdout.
 * Perfect for local development and testing without API keys.
 */

import type { EmailProvider, SendOptions, SendResult } from "../provider";

let counter = 0;

export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console" as const;

  async send(opts: SendOptions): Promise<SendResult> {
    counter += 1;
    const id = `console_${Date.now()}_${counter}`;
    const recipients = Array.isArray(opts.to) ? opts.to.join(", ") : opts.to;
    const separator = "─".repeat(60);

    const lines = [
      `\n${separator}`,
      `📧 Email (console provider)`,
      `${separator}`,
      `From:    ${opts.from}`,
      `To:      ${recipients}`,
      `Subject: ${opts.subject}`,
    ];

    if (opts.replyTo) {
      lines.push(`Reply-To: ${opts.replyTo}`);
    }

    if (opts.tags?.length) {
      const tagStr = opts.tags.map((t) => `${t.name}=${t.value}`).join(", ");
      lines.push(`Tags:    ${tagStr}`);
    }

    lines.push(`ID:      ${id}`);
    lines.push(`${separator}\n`);

    process.stdout.write(lines.join("\n"));

    return { id };
  }
}
