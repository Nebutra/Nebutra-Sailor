import { getBrandOrigin } from "@nebutra/brand/metadata-helpers";
import { AuthGate } from "@/components/AuthGate";
import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";
import { type IdPhotoMomentPage, momentLabel } from "@/lib/moments";
import { ResourceStoreUnavailableError } from "@/lib/resources";
import { listIdPhotoMoments } from "@/lib/resources.server";
import { formatDay, formatDayTime } from "@/lib/when";

/** How many Moments the page previews — and therefore how many heads it reads. */
const PREVIEW = 4;

/** A name to greet, never the raw address: the local part, or nothing to greet by. */
function displayName(email?: string): string {
  const local = email?.split("@")[0]?.trim();
  return local || "你";
}

function initial(email?: string): string {
  const local = email?.split("@")[0]?.trim();
  return (local?.[0] ?? "观").toUpperCase();
}

export default async function MePage() {
  const session = await getServerSession();

  if (!session?.userId) {
    return (
      <QuietPage active="/me" title="先让观澜认识你。" line="进入之后，拍过的才会留在 Moments。">
        <div className="hero-actions">
          <AuthGate variant="cta" />
        </div>
      </QuietPage>
    );
  }

  // The store being down costs the page its Moments, not the whole account.
  let page: IdPhotoMomentPage = { moments: [], total: 0 };
  let storeDown = false;
  try {
    page = await listIdPhotoMoments(session.userId, {}, { limit: PREVIEW });
  } catch (error) {
    if (!(error instanceof ResourceStoreUnavailableError)) throw error;
    storeDown = true;
  }

  const authHost = getBrandOrigin("auth").replace(/^https?:\/\//, "");
  const expires = formatDayTime(session.expiresAt);
  const latest = formatDay(page.latestAt);

  return (
    <QuietPage active="/me" title={displayName(session.email)} line="拍过的会留在 Moments。">
      <section className="identity">
        <span className="identity-plate" aria-hidden>
          {initial(session.email)}
        </span>
        <dl className="field-list">
          {session.email ? (
            <div className="field-row">
              <dt>邮箱</dt>
              <dd>{session.email}</dd>
            </div>
          ) : null}
          <div className="field-row">
            <dt>从哪里进来</dt>
            <dd>{authHost}</dd>
          </div>
          {expires ? (
            <div className="field-row">
              <dt>这次会话到</dt>
              <dd>{expires}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {storeDown ? <p className="note">这一刻还存不进去，Moments 先歇着。</p> : null}

      {page.total > 0 ? (
        <>
          <dl className="ledger">
            <div className="ledger-item">
              <dd className="ledger-figure">{page.total}</dd>
              <dt>留下的 Moment</dt>
            </div>
            {latest ? (
              <div className="ledger-item">
                <dd className="ledger-figure ledger-figure-sm">{latest}</dd>
                <dt>最近一张</dt>
              </div>
            ) : null}
          </dl>

          <h2 className="section-title">最近拍的</h2>
          <ul className="sku-grid">
            {page.moments.map((moment) => {
              const label = momentLabel(moment);
              return (
                <li key={moment.id}>
                  <a className="sku-card" href={moment.url}>
                    <img src={moment.url} alt={label} />
                    <span className="sku-name">{label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <div className="hero-actions">
            <a className="pill pill-ink" href="/create">
              再拍一会儿
            </a>
            <a className="pill pill-ghost" href="/moments">
              全部 Moments
            </a>
          </div>
        </>
      ) : (
        <>
          {storeDown ? null : <p className="note">还没有留下的一张。从领证照开始最快。</p>}
          <div className="hero-actions">
            <a className="pill pill-ink" href="/create/id-photo">
              拍第一张
            </a>
          </div>
        </>
      )}

      <div className="leave-row">
        <AuthGate variant="leave" />
      </div>
    </QuietPage>
  );
}
