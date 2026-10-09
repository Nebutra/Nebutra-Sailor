/** No page matched the address. */
export default function NotFound() {
  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Error 404</p>
          <h1>We couldn't find that page.</h1>
          <p className="lead">The address may be mistyped, or the page has moved.</p>
          <div className="actions">
            <a className="btn btn-primary" href="/">
              Go home
            </a>
            <a className="btn" href="/download">
              Download Pebble
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
