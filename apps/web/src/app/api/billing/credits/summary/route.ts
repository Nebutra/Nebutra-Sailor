import {
  formatCredits,
  getCreditAllowanceForPlan,
  getCreditBalance,
  getCreditTransactions,
} from "@nebutra/billing/credits";
import { logger } from "@nebutra/logger";
import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";

const TRANSACTION_LIMIT = 10;

export async function GET(request: Request) {
  const authState = await getAuth(request);

  if (!authState.userId) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!authState.orgId) {
    return NextResponse.json({ error: "No active organization on the session." }, { status: 400 });
  }

  const plan =
    typeof authState.sessionClaims.org_plan === "string"
      ? authState.sessionClaims.org_plan
      : "FREE";

  try {
    const [balance, transactions] = await Promise.all([
      getCreditBalance(authState.orgId),
      getCreditTransactions(authState.orgId, { limit: TRANSACTION_LIMIT }),
    ]);

    return NextResponse.json({
      balance: {
        amount: balance.balance,
        currency: balance.currency,
        formatted: formatCredits(balance.balance, balance.currency),
      },
      allowance: getCreditAllowanceForPlan(plan),
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        balanceAfter: transaction.balanceAfter,
        description: transaction.description,
        relatedId: transaction.relatedId,
        metadata: transaction.metadata,
        createdAt: transaction.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error("[billing:credits:summary] Failed to load credit summary", {
      organizationId: authState.orgId,
      error: error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json({ error: "Failed to load credit summary." }, { status: 500 });
  }
}
