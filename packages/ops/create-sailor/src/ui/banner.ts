import cfonts from "cfonts";
import pc from "picocolors";
import { VERSION } from "../version";

export function showBanner(): void {
  // NO_COLOR / non-TTY fallback
  if (process.env.NO_COLOR || !process.stdout.isTTY) {
    process.stdout.write(
      [
        `Sailor v${VERSION}`,
        `The open-source platform for AI-native companies`,
        `by Nebutra · https://nebutra.com`,
        "",
        "",
      ].join("\n"),
    );
    return;
  }

  cfonts.say("Sailor", {
    font: "block",
    align: "left",
    colors: ["#0033FE", "#0BF1C3"],
    gradient: ["#0033FE", "#0BF1C3"],
    transitionGradient: true,
    space: false,
  });
  process.stdout.write(
    pc.dim(`  The open-source platform for AI-native companies · v${VERSION} · nebutra.com\n\n`),
  );
}
