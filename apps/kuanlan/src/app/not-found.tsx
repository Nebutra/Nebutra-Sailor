import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";

export default function NotFound() {
  return (
    <div className="shell">
      <SiteNav />
      <main className="page-main">
        <h1>这里没有东西。</h1>
        <p className="lede">链接可能旧了，或者那一张已经被删掉了。</p>
        <div className="hero-actions">
          <Link className="pill pill-ink" href="/create">
            开拍
          </Link>
          <Link className="pill pill-ghost" href="/">
            回首页
          </Link>
        </div>
      </main>
    </div>
  );
}
