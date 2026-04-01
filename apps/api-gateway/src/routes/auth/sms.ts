import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { captchaMiddleware } from "@nebutra/captcha/server";
import { sendVerificationCode, verifyCode } from "@nebutra/sms";

const sendCodeRoute = createRoute({
  method: "post",
  path: "/send",
  tags: ["Auth"],
  summary: "Send SMS verification code",
  description:
    "Send a verification code to the given phone number. Supports China mobile numbers with or without +86 prefix.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phone: z.string().min(10).max(15),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Code sent successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    429: {
      description: "Rate limited — cooldown period active",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

const verifyCodeRoute = createRoute({
  method: "post",
  path: "/verify",
  tags: ["Auth"],
  summary: "Verify SMS code",
  description: "Verify the SMS code previously sent to the phone number.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            phone: z.string().min(10).max(15),
            code: z.string().length(6),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    200: {
      description: "Verification succeeded",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
    401: {
      description: "Invalid or expired code",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
          }),
        },
      },
    },
  },
});

export const smsAuthRoutes = new OpenAPIHono();

smsAuthRoutes.use("/send", captchaMiddleware({ expectedAction: "sms_send", skipInDev: true }));

smsAuthRoutes
  .openapi(sendCodeRoute, async (c) => {
    const { phone } = c.req.valid("json");
    const result = await sendVerificationCode(phone);
    return c.json(result, result.success ? 200 : 429);
  })
  .openapi(verifyCodeRoute, async (c) => {
    const { phone, code } = c.req.valid("json");
    const result = await verifyCode(phone, code);
    return c.json(result, result.success ? 200 : 401);
  });
