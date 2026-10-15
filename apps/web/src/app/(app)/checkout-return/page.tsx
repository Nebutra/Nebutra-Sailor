import { brand } from "@nebutra/brand/metadata";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getAuth } from "@/lib/auth";
import { CheckoutReturnContent } from "./checkout-return-content";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: `Confirming your subscription — ${brand.name}`,
};

interface CheckoutReturnPageProps {
  searchParams?: Promise<{ organizationId?: string }>;
}

export default async function CheckoutReturnPage({ searchParams }: CheckoutReturnPageProps) {
  const tc = await getTranslations("copy.checkoutReturnPage");
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
        <h1 className="font-bold text-2xl text-foreground lg:text-3xl">{tc("almostThere")}</h1>
        <p className="mt-2 text-muted-foreground text-sm">{tc("weAreConfirmingYour")}</p>
      </header>

      <CheckoutReturnContent organizationId={organizationId} />
    </section>
  );
}
