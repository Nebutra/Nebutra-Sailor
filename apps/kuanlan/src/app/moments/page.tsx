import { AuthGate } from "@/components/AuthGate";
import { MomentTile } from "@/components/MomentTile";
import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";
import { momentLabel } from "@/lib/moments";
import { listIdPhotoMoments } from "@/lib/resources.server";
import { formatDay } from "@/lib/when";

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
    const { moments } = await listIdPhotoMoments(session.userId);
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
      <QuietPage active="/moments" title="Moments" line="拍过的瞬间，最近的在前面。">
        <ul className="sku-grid">
          {moments.map((moment) => (
            <MomentTile
              key={moment.id}
              id={moment.id}
              url={moment.url}
              label={momentLabel(moment)}
              day={formatDay(moment.shotAt)}
            />
          ))}
        </ul>
      </QuietPage>
    );
  } catch {
    return <QuietPage active="/moments" title="Moments" line="这一刻还存不进去。" />;
  }
}
