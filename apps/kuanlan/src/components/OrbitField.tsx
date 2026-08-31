import Link from "next/link";
import type { CSSProperties } from "react";
import { HOME_ORBIT, orbitSrc } from "@/lib/orbit";

export function OrbitField() {
  return (
    <div className="orbit" aria-hidden={false}>
      {HOME_ORBIT.map((tile, index) => {
        const style = {
          left: `${tile.x}%`,
          top: `${tile.y}%`,
          width: `${tile.w}px`,
          opacity: tile.opacity,
          filter: tile.blur ? `blur(${tile.blur}px)` : undefined,
          "--rot": `${tile.rot}deg`,
          animationDelay: `${index * 0.4}s`,
        } as CSSProperties;

        return (
          <Link
            key={`${tile.name}-${tile.x}`}
            href={tile.href}
            className="orbit-tile"
            style={style}
            aria-label={tile.label}
          >
            <img src={orbitSrc(tile.name)} alt="" />
          </Link>
        );
      })}
    </div>
  );
}
