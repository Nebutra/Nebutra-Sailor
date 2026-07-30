import { DOCS_BASE, DOWNLOADS, GITHUB_REPO } from "@/lib/releases";

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <p className="muted">Nebutra product · brand front</p>
        <h1>The AI orchestrator for 100x builders.</h1>
        <p className="lead">
          Run Codex, Claude Code, OpenCode, and more side-by-side — each in its own git worktree,
          tracked in one desktop surface. Mobile companion, terminal splits, Design Mode, and native
          GitHub/Linear workflows.
        </p>
        <div className="actions">
          <a className="btn btn-primary" href="/download">
            Download Pebble
          </a>
          <a className="btn" href={DOCS_BASE}>
            Read the docs
          </a>
          <a className="btn" href={GITHUB_REPO}>
            Star on GitHub
          </a>
        </div>
      </section>

      <section className="grid" aria-label="Highlights">
        <article className="card">
          <h2>Parallel worktrees</h2>
          <p>Fan one prompt across agents in isolated checkouts, then merge the winner.</p>
        </article>
        <article className="card">
          <h2>Mobile companion</h2>
          <p>Steer agents from your phone and get notified when a run finishes.</p>
        </article>
        <article className="card">
          <h2>Native integrations</h2>
          <p>GitHub and Linear boards stay in-app so reviews never leave the flow.</p>
        </article>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ letterSpacing: "-0.03em" }}>Quick links</h2>
        <ul className="list">
          <li>
            <a href="/download">
              <span>Download desktop builds</span>
              <span className="badge">macOS · Windows · Linux</span>
            </a>
          </li>
          <li>
            <a href={`${DOCS_BASE}/mobile`}>
              <span>Mobile companion docs</span>
              <span className="badge">iOS · Android</span>
            </a>
          </li>
          <li>
            <a href={DOWNLOADS.all}>
              <span>All GitHub release assets</span>
              <span className="badge">canonical artifacts</span>
            </a>
          </li>
        </ul>
      </section>
    </main>
  );
}
