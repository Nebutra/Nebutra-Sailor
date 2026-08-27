"use client";

import { useTranslations } from "next-intl";
import {
  NotificationPreferencesMatrix,
  type NotificationPreferencesMatrixProps,
} from "./notification-preferences-matrix";

type SectionProps = Omit<NotificationPreferencesMatrixProps, "t">;

/**
 * Thin client wrapper that pulls the translator from `next-intl` so the page
 * (a server component) can mount the matrix without importing client hooks.
 */
export function NotificationPreferencesSection(props: SectionProps) {
  const t = useTranslations();
  return <NotificationPreferencesMatrix {...props} t={(key) => t(key)} />;
}
