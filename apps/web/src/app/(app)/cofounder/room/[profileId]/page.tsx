import { PageHeader } from "@nebutra/ui/layout";
import { getTranslations } from "next-intl/server";
import { RoomView } from "@/components/cofounder-match/room-view";

export default async function CofounderRoomPage({
  params,
}: {
  params: Promise<{ profileId: string }>;
}) {
  const tc = await getTranslations("copy.profileIdPage");
  const { profileId } = await params;

  return (
    <section className="mx-auto w-full max-w-2xl">
      <PageHeader title={tc("cofounderRoom")} description={tc("whereAMutualMatch")} />
      <RoomView profileId={profileId} />
    </section>
  );
}
