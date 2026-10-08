/** Shared UI primitives for hosted market credentials; secrets stay in the password input. */
import { Button, ButtonLink, Input, Label } from "@nebutra/ui/primitives/canonical";
import { type FormEvent, useState } from "react";
import type { MarketConnection } from "./market-connections";
export interface SourceConnectionsProps {
  signedIn: boolean;
  signInUrl: string;
  connections: MarketConnection[];
  canManage: boolean;
  busy: boolean;
  error: string;
  onSave: (label: string, apiKey: string, id?: string) => Promise<boolean>;
  onRemove: (id: string) => Promise<boolean>;
  onTest: (id: string) => Promise<boolean>;
  onRetry: () => Promise<boolean>;
}
export function SourceConnections(props: SourceConnectionsProps) {
  const [editing, setEditing] = useState<MarketConnection | "new" | null>(null);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const key = data.get("apiKey");
    const label = data.get("label");
    if (typeof key !== "string" || typeof label !== "string" || !editing) return;
    setMessage("");
    try {
      const saved = await props.onSave(label, key, editing === "new" ? undefined : editing.id);
      // Server errors remain visible; clear credentials after every attempt.
      form.reset();
      if (saved) setEditing(null);
    } finally {
      const input = form.elements.namedItem("apiKey");
      if (input instanceof HTMLInputElement) input.value = "";
    }
  }
  if (!props.signedIn)
    return (
      <div className="source-connections">
        <ButtonLink href={props.signInUrl} variant="secondary" size="sm">
          登录并连接自己的行情源
        </ButtonLink>
      </div>
    );
  return (
    <section className="source-connections" aria-label="自有行情源" aria-busy={props.busy}>
      <div className="source-connections-heading">
        <h2>我的行情源</h2>
        {props.canManage && (
          <Button
            variant="secondary"
            size="sm"
            disabled={props.busy}
            onClick={() => {
              setEditing("new");
              setMessage("");
            }}
          >
            连接行情源
          </Button>
        )}
      </div>
      {props.error && (
        <div role="alert" className="source-connection-error">
          {props.error}
          <Button
            variant="ghost"
            size="sm"
            disabled={props.busy}
            onClick={() => void props.onRetry()}
          >
            重试
          </Button>
        </div>
      )}
      {message && !props.error && <p role="status">{message}</p>}
      {props.connections.map((item) => (
        <div key={item.id} className="source-connection-row">
          <div>
            <strong>{item.label}</strong>
            <span>{item.maskedKey}</span>
          </div>
          <div className="source-connection-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={props.busy}
              onClick={() => {
                setMessage("");
                void props.onTest(item.id).then((success) => {
                  if (success) setMessage("连接成功");
                });
              }}
            >
              测试
            </Button>
            {props.canManage && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={props.busy}
                  onClick={() => setEditing(item)}
                >
                  替换 Key
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={props.busy}
                  onClick={() => void props.onRemove(item.id)}
                >
                  断开
                </Button>
              </>
            )}
          </div>
        </div>
      ))}
      {editing && (
        <form className="source-connection-form" onSubmit={(event) => void save(event)}>
          <h3>Twelve Data</h3>
          <Label htmlFor="source-label">连接名称</Label>
          <Input
            id="source-label"
            name="label"
            defaultValue={editing === "new" ? "Twelve Data" : editing.label}
            readOnly={editing !== "new"}
            maxLength={64}
            required
            disabled={props.busy}
          />
          <Label htmlFor="source-key">API Key</Label>
          <Input
            id="source-key"
            name="apiKey"
            type="password"
            autoComplete="off"
            minLength={8}
            maxLength={256}
            required
            disabled={props.busy}
          />
          <div className="source-connection-actions">
            <Button
              variant="ghost"
              size="sm"
              disabled={props.busy}
              onClick={() => setEditing(null)}
            >
              取消
            </Button>
            <Button variant="secondary" size="sm" type="submit" disabled={props.busy}>
              {props.busy ? "保存中…" : "保存连接"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
