import { AuthGate } from "@/components/AuthGate";
import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";
import { ResourceStoreUnavailableError } from "@/lib/resources";
import { listIdPhotoMoments } from "@/lib/resources.server";

export default async function MomentsPage() {
  const session = await getServerSession();

  if (!session?.userId) {
    return (
      <QuietPage active="/moments" title="Moments" line="先让观澜认识你，拍过的才会留在这里。">
        <div className="hero-actions">
          <AuthGate variant="cta" />
        </div>
      </QuietPage>
    );
  }

  try {
    const moments = await listIdPhotoMoments(session.userId);
    if (moments.length === 0) {
      return (
        <QuietPage active="/moments" title="Moments" line="还没有留下的一张。去拍一张领证照。">
          <div className="hero-actions">
            <a className="pill pill-ink" href="/create/id-photo">
              开拍
            </a>
          </div>
        </QuietPage>
      );
    }

    return (
      <QuietPage active="/moments" title="Moments" line="拍过的瞬间，在这里。">
        <ul className="sku-grid">
          {moments.map((moment) => (
            <li key={moment.id}>
              <a className="sku-card" href={moment.url}>
                <img src={moment.url} alt="拍过的一张" />
              </a>
            </li>
          ))}
        </ul>
      </QuietPage>
    );
  } catch (error) {
    if (error instanceof ResourceStoreUnavailableError) {
      return <QuietPage active="/moments" title="Moments" line="这一刻还存不进去。" />;
    }
    throw error;
  }
}
