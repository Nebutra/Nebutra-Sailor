"use client";

import { Cross, Message } from "@nebutra/icons";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useTranslations } from "next-intl";
import * as React from "react";
import { ChatInterface } from "@/components/soul/chat-interface";

export function AgentWidget() {
  const [isOpen, setIsOpen] = React.useState(false);
  const t = useTranslations("soul");

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 w-[350px] shadow-2xl rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 overflow-hidden flex flex-col h-[500px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full border border-white dark:border-gray-950 bg-green-500 absolute -bottom-0.5 -right-0.5 z-10" />
                  <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                    <Image
                      src="/images/black-nobg.webp"
                      alt="Tseka"
                      width={32}
                      height={32}
                      className="object-cover w-full h-full"
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                    {t("page_headline")}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t("status")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-800/50 transition-colors"
                aria-label="Close chat"
              >
                <Cross className="h-4 w-4" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 overflow-hidden relative">
              <ChatInterface isWidget={true} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-[51] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-[0_8px_30px_var(--color-accent-shadow)] transition-transform hover:scale-105 active:scale-95"
        aria-label="Toggle chat"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div
              key="close"
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 90 }}
              transition={{ duration: 0.15 }}
            >
              <Cross className="h-6 w-6" />
            </motion.div>
          ) : (
            <motion.div
              key="open"
              initial={{ opacity: 0, rotate: 90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -90 }}
              transition={{ duration: 0.15 }}
            >
              <Message className="h-6 w-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </button>
    </>
  );
}
