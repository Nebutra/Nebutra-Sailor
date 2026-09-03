import { type IdPhotoMoment, momentLabel } from "@/lib/moments";
import { momentShootHref } from "@/lib/shoot";
import { formatDay } from "@/lib/when";

export function MomentCard({ moment }: { moment: IdPhotoMoment }) {
  const label = momentLabel(moment);
  const day = formatDay(moment.shotAt);
  return (
    <li>
      <article className="moment-card">
        <a className="moment-still" href={moment.url}>
          <img src={moment.url} alt={label} />
          {moment.sourceUrl ? (
            <img className="moment-source" src={moment.sourceUrl} alt="" aria-hidden />
          ) : null}
        </a>
        <span className="moment-name">{label}</span>
        {day ? <span className="tile-sub">{day}</span> : null}
        <a className="pill" href={momentShootHref(moment)}>
          再拍一会儿
        </a>
      </article>
    </li>
  );
}
