import { AuthGate } from "@/components/AuthGate";
import { MomentCard } from "@/components/MomentCard";
import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";
import { ResourceStoreUnavailableError } from "@/lib/resources";
import { listIdPhotoMoments } from "@/lib/resources.server";
import { SHOOT_PATH } from "@/lib/shoot";

export default async function MomentsPage() {
  const session = await getServerSession();

  if (!session?.userId) {
    return (
      <QuietPage active="/moments" title="Moments" line="先让观澜认识你，拍过的才会留在这里。">
        <div className="hero-actions">
          <AuthGate variant="cta" returnPath="/moments" />
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
            <a className="pill pill-ink" href={SHOOT_PATH}>
              开拍
            </a>
          </div>
        </QuietPage>
      );
    }

    return (
      <QuietPage active="/moments" title="Moments" line="拍过的瞬间，最近的在前面。">
        <ul className="moment-grid">
          {moments.map((moment) => (
            <MomentCard key={moment.id} moment={moment} />
          ))}
        </ul>
      </QuietPage>
    );
  } catch (error) {
    if (!(error instanceof ResourceStoreUnavailableError)) throw error;
    return <QuietPage active="/moments" title="Moments" line="这一刻还存不进去。" />;
  }
}
