"use client";

import { ArrowLeft, Command, LoaderCircle, LogoGithub, LogoGoogle } from "@nebutra/icons";
import { motion, type Variants } from "framer-motion";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { signIn } from "@/lib/auth-client";

export default function SignInPage() {
  const t = useTranslations("auth.signin");
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);

  const handleSignIn = (provider: "github" | "google" | "linuxdo") => {
    setLoadingProvider(provider);
    signIn.social({ provider, callbackURL: "/" });
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
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
      className="bg-white/60 dark:bg-gray-900/40 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 shadow-2xl rounded-[2rem] p-8 sm:p-12 text-center"
    >
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
          {t("title")}
        </h1>
        <p className="text-gray-500 dark:text-gray-400">{t("subtitle")}</p>
      </motion.div>

      <motion.div variants={itemVariants} className="flex flex-col gap-3 mb-8">
        <button
          type="button"
          onClick={() => handleSignIn("github")}
          disabled={loadingProvider !== null}
          className="relative flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-gray-900 text-white hover:bg-gray-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
        >
          {loadingProvider === "github" ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <LogoGithub className="w-5 h-5" />
          )}
          {t("github")}
        </button>

        <button
          type="button"
          onClick={() => handleSignIn("google")}
          disabled={loadingProvider !== null}
          className="relative flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700"
        >
          {loadingProvider === "google" ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <LogoGoogle className="w-5 h-5" />
          )}
          {t("google")}
        </button>

        <button
          type="button"
          onClick={() => handleSignIn("linuxdo")}
          disabled={loadingProvider !== null}
          className="relative flex items-center justify-center gap-3 w-full py-3 px-4 rounded-xl font-medium transition-all duration-200 bg-[#34A853]/10 text-[#34A853] border border-[#34A853]/20 hover:bg-[#34A853]/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loadingProvider === "linuxdo" ? (
            <LoaderCircle className="w-5 h-5 animate-spin" />
          ) : (
            <Command className="w-5 h-5" />
          )}
          {t("linuxdo")}
        </button>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </Link>
      </motion.div>
    </motion.div>
  );
}
