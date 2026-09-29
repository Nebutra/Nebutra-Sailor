import { confirmSubscription, unsubscribe } from "@nebutra/status";
import type { Metadata } from "next";
import { connection } from "next/server";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { StatusPageSkeleton, StatusShell } from "@/components/status/status-page-view";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "Subscription",
  robots: { index: false },
};

type Search = Promise<{ action?: string; token?: string }>;

export default async function SubscriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Search;
}) {
  const { lang } = await params;
  setRequestLocale(lang as Locale);
  return (
    <Suspense fallback={<StatusPageSkeleton />}>
      <SubscriptionResult searchParams={searchParams} />
    </Suspense>
  );
}

async function SubscriptionResult({ searchParams }: { searchParams: Search }) {
  await connection();
  const { action, token } = await searchParams;
  let title = "This link is not valid";
  let body = "It may have expired or already been used. Subscribe again from the status page.";

  if (token && action === "confirm") {
    const subscriber = await confirmSubscription(token);
    if (subscriber) {
      title = "You're subscribed";
      body = `${subscriber.email} will get an email when there is an incident or scheduled maintenance.`;
    }
  } else if (token && action === "unsubscribe") {
    if (await unsubscribe(token)) {
      title = "You're unsubscribed";
      body = "You will not get any more status emails.";
    }
  }

  return (
    <StatusShell>
      <div className="rounded-xl border border-border px-6 py-8 text-center">
        <h1 className="text-lg font-medium tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
        <Link
          href="/status"
          className="mt-6 inline-block text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          Back to status
        </Link>
      </div>
    </StatusShell>
  );
}
