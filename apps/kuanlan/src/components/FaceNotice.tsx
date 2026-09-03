"use client";

import { FACE_NOTICE } from "@/lib/consent";

/**
 * The notice, shown at the moment it is about to matter — when someone has
 * chosen a spec and picked a photo — rather than as a wall in front of a page
 * they have not decided to use yet.
 */
export function FaceNotice({
  gap,
  busy,
  onAgree,
}: {
  gap: "never" | "withdrawn" | "outdated";
  busy: boolean;
  onAgree: () => void;
}) {
  return (
    <section className="notice-card">
      <h2 className="notice-title">
        {gap === "outdated"
          ? "这几句话改过了，再看一眼"
          : gap === "withdrawn"
            ? "你之前撤回过，要再开拍得先同意"
            : FACE_NOTICE.title}
      </h2>
      <ul className="notice-points">
        {FACE_NOTICE.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <button type="button" className="pill pill-ink" onClick={onAgree} disabled={busy}>
        {busy ? "记下来" : FACE_NOTICE.agree}
      </button>
    </section>
  );
}
