import {
  Button,
  ButtonLink,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Textarea,
} from "@nebutra/ui/primitives/canonical";
import { useState } from "react";
import { buildFeedbackUrl, type FeedbackDiagnostics, type HelpSection } from "./workbench-support";

export interface WorkbenchHelpProps {
  section: HelpSection | null;
  signedIn: boolean;
  signInUrl: string;
  analyticsConsent: boolean;
  diagnostics: FeedbackDiagnostics;
  onClose: () => void;
  onConsentChange: (enabled: boolean) => boolean;
  returnFocus?: HTMLElement | null;
}

export function WorkbenchHelp({
  section,
  signedIn,
  signInUrl,
  analyticsConsent,
  diagnostics,
  onClose,
  onConsentChange,
  returnFocus,
}: WorkbenchHelpProps) {
  const [message, setMessage] = useState("");
  const [includeDiagnostics, setIncludeDiagnostics] = useState(false);
  const [consentError, setConsentError] = useState("");
  const feedback = section === "feedback";
  return (
    <Dialog
      open={section !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="kcq-help"
        finalFocus={returnFocus ? { current: returnFocus } : true}
      >
        <DialogHeader>
          <DialogTitle>{feedback ? "反馈与建议" : "开始研究"}</DialogTitle>
          <DialogDescription>
            {feedback
              ? "描述发生了什么，以及你期待的结果。"
              : "从一张图开始，再让 Agent 帮你验证问题。"}
          </DialogDescription>
        </DialogHeader>
        {feedback ? (
          <div className="kcq-help-body">
            <label htmlFor="kcq-feedback">遇到了什么问题，或希望改进什么？</label>
            <Textarea
              id="kcq-feedback"
              rows={5}
              maxLength={2000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="操作步骤、实际结果、期待的结果"
            />
            <Checkbox
              className="kcq-help-option"
              checked={includeDiagnostics}
              onCheckedChange={setIncludeDiagnostics}
            >
              附上基础诊断（图表版本、主题、屏幕尺寸类别）
            </Checkbox>
            {includeDiagnostics && (
              <pre className="kcq-diagnostics">
                Chart: {diagnostics.chartRevision}
                {"\n"}Theme: {diagnostics.theme}
                {"\n"}Viewport: {diagnostics.viewport}
              </pre>
            )}
            <p>将打开 GitHub 公开 Issue 草稿，由你检查并提交。请勿填写 API Key、账户或交易隐私。</p>
            {message.trim() ? (
              <ButtonLink
                href={buildFeedbackUrl(message, includeDiagnostics ? diagnostics : undefined)}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                className="kcq-help-primary"
              >
                前往 GitHub 检查并提交
              </ButtonLink>
            ) : (
              <Button disabled size="sm">
                前往 GitHub 检查并提交
              </Button>
            )}
          </div>
        ) : (
          <div className="kcq-help-body">
            <ol className="kcq-guide-steps">
              <li>
                <strong>选择商品</strong>
                <p>空图可直接选 A 股、BTC 或美股；也可以在顶部工具栏搜索自己的商品。</p>
              </li>
              <li>
                <strong>打开右侧 Agent</strong>
                <p>点击右侧展开按钮，选择趋势或指标提问模板，再编辑问题。已有对话可新建会话。</p>
              </li>
              <li>
                <strong>检查后发送</strong>
                <p>
                  先开启 Agent 的只读模式，确认问题后再发送。托管 AI 需要登录，按实际用量扣减 AI
                  余额；选择模板不会发起付费请求。
                </p>
              </li>
            </ol>
            {!signedIn && (
              <ButtonLink href={signInUrl} size="sm" className="kcq-help-primary">
                登录后使用托管 Agent
              </ButtonLink>
            )}
            <p>布局、自选和研究记录保存在当前浏览器，按账户与工作区隔离，暂不跨设备同步。</p>
            <a href="/zh/docs" target="_blank" rel="noopener noreferrer" className="kcq-help-link">
              阅读使用文档
            </a>
            <Checkbox
              className="kcq-help-option"
              checked={analyticsConsent}
              onCheckedChange={(enabled) =>
                setConsentError(onConsentChange(enabled) ? "" : "无法保存偏好，匿名统计保持关闭。")
              }
            >
              允许匿名使用统计，帮助改进 KCQ
            </Checkbox>
            <p className="kcq-help-note">
              默认关闭。仅记录打开图表、研究成功或失败等步骤，不发送问题正文、商品、自选或账户信息。遵循浏览器的“请勿追踪”设置，可随时关闭。
            </p>
            {consentError && <p role="alert">{consentError}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
