import { Announcement, AnnouncementTag, AnnouncementTitle } from "@nebutra/ui/primitives";
import { ArrowUpRight } from "lucide-react";

export function AnnouncementDemo() {
  return (
    <div className="max-w-md px-4 py-8 space-y-4 flex w-full flex-col items-center justify-center">
      <Announcement>
        <AnnouncementTag>Beta</AnnouncementTag>
        <AnnouncementTitle>Multi-agent workflows are now available</AnnouncementTitle>
      </Announcement>

      <Announcement>
        <AnnouncementTag>New</AnnouncementTag>
        <AnnouncementTitle>
          Read the release notes
          <ArrowUpRight size={14} />
        </AnnouncementTitle>
      </Announcement>
    </div>
  );
}
