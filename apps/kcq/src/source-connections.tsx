/** Shared UI primitives for hosted market credentials; secrets stay in the password input. */
import { Button, ButtonLink, Input } from "@nebutra/ui/primitives/canonical";
import { type FormEvent, useEffect, useRef, useState } from "react";
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
  const [fieldError, setFieldError] = useState("");
  const [labelError, setLabelError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const editorTrigger = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!editing) editorTrigger.current?.focus();
  }, [editing]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const key = data.get("apiKey");
    const label = data.get("label");
    if (typeof key !== "string" || typeof label !== "string" || !editing) return;
    if (props.busy) return;
    if (!label.trim() || label.length > 64 || key.length < 8 || key.length > 256) {
      setLabelError(!label.trim() || label.length > 64 ? "请输入 1–64 个字符的连接名称。" : "");
      setFieldError(key.length < 8 || key.length > 256 ? "请输入 8–256 个字符的 API Key。" : "");
      const input = form.elements.namedItem(!label.trim() ? "label" : "apiKey");
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }
    setFieldError("");
    setLabelError("");
    setMessage("");
    try {
      const saved = await props.onSave(label, key, editing === "new" ? undefined : editing.id);
      // Server errors remain visible; clear credentials after every attempt.
      form.reset();
      if (saved) setEditing(null);
    } finally {
      const input = form.elements.namedItem("apiKey");
      if (input instanceof HTMLInputElement) input.value = "";
      // Remount the shared uncontrolled Input too, so a later render cannot
      // restore a credential retained in its internal value state.
      setAttempt((value) => value + 1);
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
            onClick={(event) => {
              editorTrigger.current = event.currentTarget;
              setEditing("new");
              setFieldError("");
              setLabelError("");
              setMessage("");
            }}
          >
            连接行情源
          </Button>
        )}
      </div>
      {props.error && (
        <div id="source-connection-error" role="alert" className="source-connection-error">
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
                  onClick={(event) => {
                    editorTrigger.current = event.currentTarget;
                    setEditing(item);
                    setFieldError("");
                    setLabelError("");
                    setMessage("");
                  }}
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
        <form
          key={`${editing === "new" ? "new" : editing.id}:${attempt}`}
          className="source-connection-form"
          noValidate
          onSubmit={(event) => void save(event)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && !props.busy) {
              event.preventDefault();
              event.stopPropagation();
              setEditing(null);
            }
          }}
        >
          <h3>Twelve Data</h3>
          <Input
            label="连接名称"
            id="source-label"
            name="label"
            size="sm"
            autoFocus={editing === "new"}
            defaultValue={editing === "new" ? "Twelve Data" : editing.label}
            readOnly={editing !== "new"}
            maxLength={64}
            required
            error={labelError || undefined}
            onChange={() => setLabelError("")}
            disabled={props.busy}
          />
          <Input
            label="API Key"
            id="source-key"
            name="apiKey"
            size="sm"
            autoFocus={editing !== "new"}
            aria-describedby={props.error ? "source-connection-error" : undefined}
            error={fieldError || undefined}
            onChange={() => setFieldError("")}
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
            <Button size="sm" type="submit" loading={props.busy}>
              {props.busy ? "保存中…" : "保存连接"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
