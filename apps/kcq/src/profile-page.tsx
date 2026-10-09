import {
  type BrowserAuthContext,
  buildAuthCenterSignInUrl,
  type createAuthCenterBrowserClient,
} from "@nebutra/auth/browser";
import { brand } from "@nebutra/brand/metadata";
import { ArrowLeft } from "@nebutra/icons";
import { Avatar, Button, ButtonLink, Input, Label } from "@nebutra/ui/primitives/canonical";
import { type FormEvent, useState } from "react";
import { APP_PATH } from "./main-route";

export interface ProfilePageProps {
  context: BrowserAuthContext | null;
  auth: ReturnType<typeof createAuthCenterBrowserClient>;
}

export function ProfilePage({ context, auth }: ProfilePageProps) {
  const [user, setUser] = useState(context?.user ?? null);
  const [name, setName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const trimmed = name.trim();
  const invalid = trimmed.length === 0 || trimmed.length > 64;
  const signInUrl = buildAuthCenterSignInUrl(window.location.origin + "/settings/profile", {
    NEXT_PUBLIC_AUTH_URL: `https://${brand.domains.auth}`,
  });

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!user || invalid || trimmed === user.name || saving) return;
    setSaving(true);
    setMessage("");
    setFailed(false);
    try {
      const latest = await auth.getContext();
      if (!latest || latest.user.id !== user.id) {
        window.location.reload();
        return;
      }
      await auth.updateProfile(trimmed);
      const updated = await auth.getContext();
      if (!updated || updated.user.id !== user.id) {
        window.location.reload();
        return;
      }
      setUser(updated.user);
      setName(updated.user.name);
      setMessage("已保存");
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "保存失败，请重试。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="profile-page">
      <header className="profile-header">
        <ButtonLink href={APP_PATH} variant="ghost" size="sm">
          <ArrowLeft aria-hidden="true" />
          返回工作台
        </ButtonLink>
      </header>
      <main className="profile-content" aria-labelledby="profile-title">
        <h1 id="profile-title">个人资料</h1>
        {user ? (
          <section className="profile-card" aria-label="账户资料">
            <div className="profile-identity">
              <Avatar size={48} src={user.image ?? undefined} title={user.name || user.email} />
              <div>
                <h2>{user.name || user.email}</h2>
                <p>{user.email}</p>
              </div>
            </div>
            <form className="profile-form" onSubmit={(event) => void save(event)}>
              <Label htmlFor="profile-name">显示名称</Label>
              <Input
                id="profile-name"
                name="name"
                autoComplete="name"
                maxLength={64}
                value={name}
                disabled={saving}
                onChange={(event) => {
                  setName(event.target.value);
                  setMessage("");
                }}
              />
              <div className="profile-form-footer">
                <p role={failed ? "alert" : "status"} className={failed ? "profile-error" : ""}>
                  {message}
                </p>
                <Button
                  className="profile-save"
                  variant="secondary"
                  size="sm"
                  type="submit"
                  disabled={saving || trimmed === user.name || invalid}
                  aria-busy={saving}
                >
                  {saving ? "保存中…" : "保存"}
                </Button>
              </div>
            </form>
          </section>
        ) : (
          <section className="profile-card profile-signed-out">
            <h2>登录后管理个人资料</h2>
            <ButtonLink href={signInUrl} variant="secondary" size="sm">
              登录 {brand.name}
            </ButtonLink>
          </section>
        )}
      </main>
    </div>
  );
}
