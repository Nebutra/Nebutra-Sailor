/**
 * Pusher Auth Endpoint Example
 *
 * Copy this to your app's API routes:
 * - Next.js: apps/web/app/api/pusher/auth/route.ts
 * - BFF: apps/api-gateway/src/routes/pusher/auth.ts
 */

/**
 * Channel access validation
 * Implement your own access control logic here
 */
interface User {
  id: string;
  tenantId?: string;
  name?: string;
  avatar?: string;
}

function validateChannelAccess(
  channelName: string,
  user: User,
): { allowed: boolean; reason?: string } {
  // Private tenant channel - check tenant membership
  if (channelName.startsWith("private-tenant-")) {
    const tenantId = channelName.replace("private-tenant-", "");
    if (user.tenantId !== tenantId) {
      return { allowed: false, reason: "User not in tenant" };
    }
  }

  // Private user channel - check user ownership
  if (channelName.startsWith("private-user-")) {
    const userId = channelName.replace("private-user-", "");
    if (user.id !== userId) {
      return { allowed: false, reason: "Not channel owner" };
    }
  }

  // Presence channel - allow if authenticated
  if (channelName.startsWith("presence-")) {
    // Add custom room access checks here if needed
    // e.g., check if user has access to the document/room
  }

  return { allowed: true };
}

// ============================================================================
// Next.js App Router Example
// ============================================================================

/*
// apps/web/app/api/pusher/auth/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeChannel } from "@/lib/pusher/server";

export async function POST(request: NextRequest) {
  try {
    const { userId, orgId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const socketId = formData.get("socket_id") as string;
    const channelName = formData.get("channel_name") as string;
    
    if (!socketId || !channelName) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    
    // Validate channel access
    const user = { id: userId, tenantId: orgId };
    const validation = validateChannelAccess(channelName, user);
    
    if (!validation.allowed) {
      return NextResponse.json({ error: validation.reason }, { status: 403 });
    }
    
    // Get user info for presence channels
    let presenceData: { user_id: string; user_info?: Record<string, unknown> } | undefined;
    
    if (channelName.startsWith("presence-")) {
      // Fetch user details from your database
      const userDetails = await fetchUserDetails(userId);
      
      presenceData = {
        user_id: userId,
        user_info: {
          name: userDetails?.name || "Anonymous",
          avatar: userDetails?.avatar,
        },
      };
    }
    
    const authResponse = authorizeChannel(socketId, channelName, presenceData);
    
    return NextResponse.json(authResponse);
  } catch (error) {
    console.error("Pusher auth error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
*/

// ============================================================================
// Hono (BFF) Example
// ============================================================================

/*
// apps/api-gateway/src/routes/pusher/auth.ts
import { Hono } from "hono";
import { authorizeChannel } from "@/lib/pusher/server";
import { getTenantContext } from "@/middlewares/tenantContext";

const pusherRoutes = new Hono();

pusherRoutes.post("/auth", async (c) => {
  const tenant = getTenantContext(c);
  
  if (!tenant.userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const body = await c.req.parseBody();
  const socketId = body.socket_id as string;
  const channelName = body.channel_name as string;
  
  if (!socketId || !channelName) {
    return c.json({ error: "Missing parameters" }, 400);
  }
  
  // Validate channel access
  const user = { id: tenant.userId, tenantId: tenant.tenantId };
  const validation = validateChannelAccess(channelName, user);
  
  if (!validation.allowed) {
    return c.json({ error: validation.reason }, 403);
  }
  
  // Authorize
  let presenceData;
  if (channelName.startsWith("presence-")) {
    presenceData = {
      user_id: tenant.userId,
      user_info: { name: tenant.userName || "User" },
    };
  }
  
  const authResponse = authorizeChannel(socketId, channelName, presenceData);
  
  return c.json(authResponse);
});

export { pusherRoutes };
*/

export type { User };
export { validateChannelAccess };
