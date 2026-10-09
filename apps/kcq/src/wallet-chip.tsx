/** The KCQ wallet in the toolbar: balance at a glance, recent calls and the top-up entry. */
import { ArrowUpRight, Coins } from "@nebutra/icons";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nebutra/ui/primitives/canonical";
import {
  formatAmount,
  formatBalance,
  isLow,
  KCQ_TOP_UP_PRESETS,
  topUpUrl,
  type WalletState,
} from "./wallet";

export interface WalletChipProps {
  wallet: WalletState;
  /** This app's origin; checkout sends the buyer back here once paid. */
  origin: string;
  /** The menu opened: refresh the balance so it is never a stale number. */
  onOpen: () => void;
}

/** Plain-language label of the trigger, also its accessible name. */
export function walletLabel(wallet: WalletState): string {
  switch (wallet.status) {
    case "loading":
      return "余额";
    case "error":
      return "余额不可用";
    case "internal":
      return "内部使用 · 不计费";
    case "ready":
      return formatBalance(wallet.balance, wallet.currency);
  }
}

function time(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("zh-CN", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function WalletChip({ wallet, origin, onOpen }: WalletChipProps) {
  const label = walletLabel(wallet);
  return (
    <DropdownMenu onOpenChange={(open) => open && onOpen()}>
      <DropdownMenuTrigger
        className="account-trigger wallet-trigger"
        data-low={isLow(wallet) || undefined}
        aria-label={`KCQ AI ${label}`}
      >
        <Coins aria-hidden="true" />
        <span className="wallet-amount">{label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="kcq-menu w-72">
        <div className="account-identity">
          <span>KCQ AI 余额</span>
          <strong>
            {wallet.status === "ready" ? label : wallet.status === "internal" ? "内部使用" : "—"}
          </strong>
        </div>
        {wallet.status === "internal" && (
          <p className="wallet-note">平台成员的 AI 调用走内部通道，不计费，也无需充值。</p>
        )}
        {wallet.status === "error" && (
          <p className="wallet-note" role="alert">
            余额暂时读取失败，再次打开菜单可重试。
          </p>
        )}
        {wallet.status === "ready" && (
          <>
            <p className="wallet-note">按量扣费，余额属于当前工作区。</p>
            {wallet.usage.length > 0 && (
              <ul className="wallet-usage" aria-label="最近调用">
                {wallet.usage.slice(0, 5).map((row) => (
                  <li key={row.id}>
                    <span className="truncate">{row.model ?? "AI"}</span>
                    <span>{time(row.occurredAt)}</span>
                    <span className="wallet-cost">-{formatAmount(row.cost)}</span>
                  </li>
                ))}
              </ul>
            )}
            <DropdownMenuSeparator />
            {KCQ_TOP_UP_PRESETS.map((amount) => (
              <DropdownMenuItem
                key={amount}
                render={
                  <a href={topUpUrl(origin, amount)}>
                    充值 ${amount}
                    <ArrowUpRight className="ml-auto" />
                  </a>
                }
              />
            ))}
            <DropdownMenuItem
              render={
                <a href={topUpUrl(origin)}>
                  其他金额
                  <ArrowUpRight className="ml-auto" />
                </a>
              }
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface InsufficientBalanceProps {
  origin: string;
  onDismiss: () => void;
}

/** Shown when the managed provider answered 402: the way forward, not a generic error. */
export function InsufficientBalanceNotice({ origin, onDismiss }: InsufficientBalanceProps) {
  return (
    <div className="notice balance-notice" role="alert">
      <span>当前工作区的 KCQ 余额不足，AI 暂时无法回答。充值后即可继续。</span>
      <span className="balance-notice-actions">
        <Button
          type="button"
          size="sm"
          variant="ink"
          onClick={() => window.location.assign(topUpUrl(origin, KCQ_TOP_UP_PRESETS[0]))}
        >
          充值
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDismiss}>
          稍后
        </Button>
      </span>
    </div>
  );
}
