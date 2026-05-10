import { logger } from "@nebutra/logger";
import type { Context, Next } from "hono";
import { getPermissions } from "./factory.js";
import type { Action, PermissionContext, Resource } from "./types.js";
import { ForbiddenError } from "./types.js";

export interface RequirePermissionOptions {
  onDenied?: (c: Context, error: ForbiddenError) => Response | Promise<Response>;
  extractSubject?: (c: Context) => unknown;
}

export function requirePermission(
  action: Action,
  resource: Resource,
  options?: RequirePermissionOptions,
) {
  return async (c: Context, next: Next) => {
    const permissionsManager = getPermissions();

    const user = c.get("user") as PermissionContext | undefined;
    if (!user) {
      logger.warn("requirePermission: no user context found");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const subject = options?.extractSubject?.(c);
    const canAccess = permissionsManager.can(user, action, resource, subject);

    if (!canAccess) {
      const error = new ForbiddenError(action, resource, user);
      logger.info("Permission denied", {
        userId: user.userId,
        action,
        resource,
        subject,
      });

      if (options?.onDenied) {
        return options.onDenied(c, error);
      }

      return c.json(
        {
          error: "Forbidden",
          message: error.message,
        },
        403,
      );
    }

    return next();
  };
}

export function attachPermissionContext(
  extractUser: (c: Context) => PermissionContext | Promise<PermissionContext>,
) {
  return async (c: Context, next: Next) => {
    try {
      const user = await extractUser(c);
      c.set("user", user);
    } catch (error) {
      logger.error("Failed to extract user context", { error });
      return c.json({ error: "Internal Server Error" }, 500);
    }

    return next();
  };
}
