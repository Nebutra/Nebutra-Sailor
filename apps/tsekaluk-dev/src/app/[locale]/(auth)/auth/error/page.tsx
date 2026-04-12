"use client";

import { ArrowLeft, Warning } from "@nebutra/icons";
import { motion, type Variants } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { Link } from "@/i18n/navigation";

function ErrorContent() {
  const t = useTranslations("auth.error");
  const searchParams = useSearchParams();
  const errorType = searchParams.get("error");

  let errorMessageStr = t("default");
  if (errorType === "Configuration") {
    errorMessageStr = t("configuration");
  } else if (errorType === "AccessDenied") {
    errorMessageStr = t("access_denied");
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 30,
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-red-500/20 shadow-2xl shadow-red-500/10 rounded-[2rem] p-8 sm:p-12 text-center"
    >
      <motion.div variants={itemVariants} className="mb-6 flex justify-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
          <Warning className="w-8 h-8" />
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-6">{t("subtitle")}</p>

        <div className="bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-xl p-4 text-sm text-red-800 dark:text-red-300 text-left">
          {errorMessageStr}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        <Link
          href="/auth/signin"
          className="relative flex items-center justify-center w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {t("try_again")}
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </Link>
      </motion.div>
    </motion.div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="h-[400px] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
