import { useTranslations } from "next-intl";
import { FooterMinimal, Navbar } from "@/components/landing";
import { Unicorn404 } from "@/components/landing/404/Unicorn404";

export default function LocalizedNotFound() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col justify-center">
        <Unicorn404 title={t("title")} desc={t("desc")} homeText={t("home")} docsText={t("docs")} />
      </main>
      <FooterMinimal />
    </div>
  );
}
