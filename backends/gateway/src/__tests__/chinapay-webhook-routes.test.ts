import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  acceptWebhookEventMock,
  markFailedMock,
  markProcessedMock,
  handleCreditPurchaseWebhookMock,
  verifyAndDecryptWechatNotificationMock,
  verifyAlipayNotificationMock,
} = vi.hoisted(() => ({
  acceptWebhookEventMock: vi.fn(),
  markFailedMock: vi.fn(),
  markProcessedMock: vi.fn(),
  handleCreditPurchaseWebhookMock: vi.fn(),
  verifyAndDecryptWechatNotificationMock: vi.fn(),
  verifyAlipayNotificationMock: vi.fn(),
}));

vi.mock("@nebutra/logger", () => ({
  logger: {
    child: () => ({ debug: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@nebutra/db", () => ({ getSystemDb: () => ({}) }));

vi.mock("@nebutra/repositories", () => ({
  acceptWebhookEvent: (...args: unknown[]) => acceptWebhookEventMock(...args),
  WebhookEventRepository: class WebhookEventRepository {
    markFailed = (...args: unknown[]) => markFailedMock(...args);
    markProcessed = (...args: unknown[]) => markProcessedMock(...args);
  },
}));

vi.mock("@nebutra/billing", () => ({
  handleCreditPurchaseWebhook: (...args: unknown[]) => handleCreditPurchaseWebhookMock(...args),
  verifyAndDecryptWechatNotification: (...args: unknown[]) =>
    verifyAndDecryptWechatNotificationMock(...args),
  verifyAlipayNotification: (...args: unknown[]) => verifyAlipayNotificationMock(...args),
  WECHAT_NOTIFY_OK: { code: "SUCCESS", message: "成功" },
  WECHAT_NOTIFY_FAIL: (message: string) => ({ code: "FAIL", message }),
  ALIPAY_NOTIFY_SUCCESS_BODIES: ["TRADE_SUCCESS", "TRADE_FINISHED"],
}));

import { chinaPayWebhookRoutes } from "../routes/webhooks/chinapay.js";

const wechatHeaders = {
  "Wechatpay-Timestamp": "1690000000",
  "Wechatpay-Nonce": "nonce",
  "Wechatpay-Signature": "sig",
  "Wechatpay-Serial": "serial-1",
};

describe("ChinaPay webhook HTTP mapping", () => {
  beforeEach(() => {
    acceptWebhookEventMock.mockReset();
    markFailedMock.mockReset();
    markProcessedMock.mockReset();
    handleCreditPurchaseWebhookMock.mockReset();
    verifyAndDecryptWechatNotificationMock.mockReset();
    verifyAlipayNotificationMock.mockReset();
    markProcessedMock.mockResolvedValue({});
    markFailedMock.mockResolvedValue({});
  });

  describe("POST /chinapay/wechat", () => {
    it("400s with missing signature headers before touching the inbox", async () => {
      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        body: "{}",
      });

      expect(response.status).toBe(400);
      expect(acceptWebhookEventMock).not.toHaveBeenCalled();
    });

    it("400s when signature verification throws", async () => {
      verifyAndDecryptWechatNotificationMock.mockRejectedValue(new Error("bad signature"));

      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        headers: wechatHeaders,
        body: "{}",
      });

      expect(response.status).toBe(400);
      expect(acceptWebhookEventMock).not.toHaveBeenCalled();
    });

    it("credits the purchase and acks only after markProcessed on a SUCCESS trade", async () => {
      verifyAndDecryptWechatNotificationMock.mockResolvedValue({
        out_trade_no: "credit_1000_org_1",
        transaction_id: "wx_txn_1",
        trade_state: "SUCCESS",
        attach: JSON.stringify({ t: "credit_purchase", o: "org_1", c: "1000" }),
        amount: { total: 990, currency: "CNY" },
      });
      acceptWebhookEventMock.mockResolvedValue({ outcome: "process" });
      handleCreditPurchaseWebhookMock.mockResolvedValue({ handled: true });

      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        headers: wechatHeaders,
        body: "{}",
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ code: "SUCCESS", message: "成功" });
      expect(handleCreditPurchaseWebhookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "chinapay",
          sessionId: "credit_1000_org_1",
          metadata: {
            type: "credit_purchase",
            organizationId: "org_1",
            creditAmount: "1000",
            referenceId: undefined,
          },
          amountPaid: 9.9,
          currency: "CNY",
        }),
      );
      expect(markProcessedMock).toHaveBeenCalledWith("chinapay", "wx_txn_1:SUCCESS");
    });

    it("does not credit a non-SUCCESS trade state but still acks and marks processed", async () => {
      verifyAndDecryptWechatNotificationMock.mockResolvedValue({
        out_trade_no: "credit_1000_org_1",
        transaction_id: "wx_txn_1",
        trade_state: "REFUND",
      });
      acceptWebhookEventMock.mockResolvedValue({ outcome: "process" });

      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        headers: wechatHeaders,
        body: "{}",
      });

      expect(response.status).toBe(200);
      expect(handleCreditPurchaseWebhookMock).not.toHaveBeenCalled();
      expect(markProcessedMock).toHaveBeenCalled();
    });

    it("acks without reprocessing when the inbox reports skip_processed", async () => {
      verifyAndDecryptWechatNotificationMock.mockResolvedValue({
        out_trade_no: "x",
        transaction_id: "wx_txn_1",
        trade_state: "SUCCESS",
      });
      acceptWebhookEventMock.mockResolvedValue({ outcome: "skip_processed" });

      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        headers: wechatHeaders,
        body: "{}",
      });

      expect(response.status).toBe(200);
      expect(handleCreditPurchaseWebhookMock).not.toHaveBeenCalled();
      expect(markProcessedMock).not.toHaveBeenCalled();
    });

    it("marks failed and returns 500 when the handler throws", async () => {
      verifyAndDecryptWechatNotificationMock.mockResolvedValue({
        out_trade_no: "credit_1000_org_1",
        transaction_id: "wx_txn_1",
        trade_state: "SUCCESS",
      });
      acceptWebhookEventMock.mockResolvedValue({ outcome: "process" });
      handleCreditPurchaseWebhookMock.mockRejectedValue(new Error("ledger down"));

      const response = await chinaPayWebhookRoutes.request("/chinapay/wechat", {
        method: "POST",
        headers: wechatHeaders,
        body: "{}",
      });

      expect(response.status).toBe(500);
      expect(markFailedMock).toHaveBeenCalledWith("chinapay", "wx_txn_1:SUCCESS", "ledger down");
    });
  });

  describe("POST /chinapay/alipay", () => {
    function form(fields: Record<string, string>): string {
      return new URLSearchParams(fields).toString();
    }

    it("responds 'failure' as plain text, not JSON, on a bad signature", async () => {
      verifyAlipayNotificationMock.mockReturnValue(false);

      const response = await chinaPayWebhookRoutes.request("/chinapay/alipay", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({ trade_status: "TRADE_SUCCESS", out_trade_no: "x", sign: "bad" }),
      });

      expect(response.status).toBe(400);
      await expect(response.text()).resolves.toBe("failure");
      expect(acceptWebhookEventMock).not.toHaveBeenCalled();
    });

    it("credits the purchase and responds the literal string 'success'", async () => {
      verifyAlipayNotificationMock.mockReturnValue(true);
      acceptWebhookEventMock.mockResolvedValue({ outcome: "process" });
      handleCreditPurchaseWebhookMock.mockResolvedValue({ handled: true });

      const response = await chinaPayWebhookRoutes.request("/chinapay/alipay", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({
          trade_status: "TRADE_SUCCESS",
          out_trade_no: "credit_1000_org_1",
          trade_no: "2026090322001",
          total_amount: "9.90",
          passback_params: encodeURIComponent(
            JSON.stringify({ t: "credit_purchase", o: "org_1", c: "1000" }),
          ),
          sign: "ok",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("success");
      expect(handleCreditPurchaseWebhookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "chinapay",
          sessionId: "credit_1000_org_1",
          amountPaid: 9.9,
          currency: "CNY",
        }),
      );
      expect(markProcessedMock).toHaveBeenCalledWith("chinapay", "2026090322001:TRADE_SUCCESS");
    });

    it("acks 'success' without reprocessing when the inbox reports in_flight", async () => {
      verifyAlipayNotificationMock.mockReturnValue(true);
      acceptWebhookEventMock.mockResolvedValue({ outcome: "in_flight" });

      const response = await chinaPayWebhookRoutes.request("/chinapay/alipay", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form({
          trade_status: "TRADE_SUCCESS",
          out_trade_no: "x",
          trade_no: "t1",
          sign: "ok",
        }),
      });

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe("success");
      expect(handleCreditPurchaseWebhookMock).not.toHaveBeenCalled();
    });
  });
});
