import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { CheckoutReturnContent } from "./checkout-return-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Confirming your subscription — Nebutra",
};

interface CheckoutReturnPageProps {
  searchParams?: Promise<{ organizationId?: string }>;
}

export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
  const { userId } = await getAuth();
  if (!userId) {
    redirect("/sign-in");
  }

  const resolved = (await searchParams) ?? {};
  const organizationId =
    typeof resolved.organizationId === "string" ? resolved.organizationId : undefined;

  return (
    <section className="mx-auto w-full max-w-2xl px-4 py-12 md:px-6">
      <header className="mb-6 text-center">
        <h1 className="font-bold text-2xl text-[color:var(--neutral-12)] dark:text-white lg:text-3xl">
          Almost there
        </h1>
        <p className="mt-2 text-[color:var(--neutral-11)] text-sm dark:text-white/70">
          We are confirming your subscription with the payment provider.
        </p>
      </header>

      <CheckoutReturnContent organizationId={organizationId} />
    </section>
  );
}
