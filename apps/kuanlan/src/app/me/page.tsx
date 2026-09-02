import { AuthGate } from "@/components/AuthGate";
import { QuietPage } from "@/components/QuietPage";
import { getServerSession } from "@/lib/auth";

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

  const who = session.email ?? "你";
  return (
    <QuietPage active="/me" title={who} line="拍过的会留在 Moments。">
      <div className="hero-actions">
        <a className="pill pill-ink" href="/moments">
          Moments
        </a>
        <AuthGate />
      </div>
    </QuietPage>
  );
}
