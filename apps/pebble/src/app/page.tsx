import { brand } from "@nebutra/brand/metadata";
import { publicAssetUrl } from "@nebutra/brand/metadata-helpers";
import { DOCS_BASE, DOWNLOADS, GITHUB_REPO } from "@/lib/releases";

const features = [
  {
    index: "01",
    title: "Parallel worktrees",
    body: "Fan one prompt across agents in isolated git checkouts — compare, then merge the winner.",
  },
  {
    index: "02",
    title: "Mobile companion",
    body: "Steer agents from your phone. Get notified when a run finishes and send follow-ups anywhere.",
  },
  {
    index: "03",
    title: "Native integrations",
    body: "GitHub and Linear stay in-app so reviews never force a context switch.",
  },
] as const;

export default function HomePage() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">{brand.name} product · 溪石</p>
          <h1>
            Small, precise contributions.
            <br />
            <em>Assembled into real work.</em>
          </h1>
          <p className="lead">
            Pebble is the AI orchestrator for 100x builders — run Codex, Claude Code, OpenCode and
            more side-by-side, each in its own worktree, tracked in one place.
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
          <div className="meta-row">
            <span>macOS · Windows · Linux</span>
            <span>
              <code>brew install --cask nebutra/pebble/pebble</code>
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-frame">
            <img
              src={publicAssetUrl("pebble/assets/hero.jpg")}
              alt="Pebble desktop running agents in parallel worktrees"
              width={1600}
              height={1000}
            />
          </div>
          <div className="hero-float" aria-hidden>
            <img src={publicAssetUrl("pebble/assets/mark.png")} alt="" width={320} height={320} />
          </div>
        </div>
      </section>

      <h2 className="section-title">Built for daily shipping</h2>
      <section className="grid" aria-label="Highlights">
        {features.map((f) => (
          <article className="card" key={f.index}>
            <span className="card-index">{f.index}</span>
            <h2>{f.title}</h2>
            <p>{f.body}</p>
          </article>
        ))}
      </section>

      <h2 className="section-title">Get started</h2>
      <ul className="list">
        <li>
          <a href="/download">
            <span>Download desktop builds</span>
            <span className="badge">macOS · Windows · Linux</span>
          </a>
        </li>
        <li>
          <a href={`${DOCS_BASE}/mobile`}>
            <span>Mobile companion</span>
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
    </main>
  );
}
