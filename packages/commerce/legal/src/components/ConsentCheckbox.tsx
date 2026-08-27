"use client";

/**
 * Consent Checkbox Component
 *
 * A checkbox component for legal document consent (Terms of Service, Privacy Policy, etc.)
 * Used in signup forms, checkout flows, and settings pages.
 */

import { useCallback, useEffect, useState } from "react";
import { hasDocumentConsentCached, recordDocumentConsent } from "../consent/service";
import { getDocumentConfig } from "../documents/config";
import type { ConsentType } from "../types";

// ============================================
// Types
// ============================================

export interface ConsentCheckboxProps {
  /** Document slug (e.g., "terms-of-service", "privacy-policy") */
  documentSlug: string;
  /** Document version (optional, defaults to latest) */
  documentVersion?: string;
  /** Whether the checkbox is required */
  required?: boolean;
  /** Controlled checked state */
  checked?: boolean;
  /** Callback when checked state changes */
  onChange?: (checked: boolean) => void;
  /** Callback when consent is recorded */
  onConsentRecorded?: () => void;
  /** Context for consent (e.g., "signup", "checkout") */
  context?: string;
  /** Whether to persist consent to server on check */
  persistOnCheck?: boolean;
  /** Custom label (overrides default from document config) */
  label?: React.ReactNode;
  /** Custom class names */
  className?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================
// Consent Checkbox Component
// ============================================

export function ConsentCheckbox({
  documentSlug,
  documentVersion,
  required = true,
  checked: controlledChecked,
  onChange,
  onConsentRecorded,
  context = "signup",
  persistOnCheck = false,
  label: customLabel,
  className = "",
  error,
  disabled = false,
}: ConsentCheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  // Get document config for default label
  const documentConfig = getDocumentConfig(documentSlug);
  const documentTitle = documentConfig?.metadata.title ?? documentSlug;

  // Check if already consented
  useEffect(() => {
    if (hasDocumentConsentCached(documentSlug, documentVersion)) {
      if (!isControlled) {
        setInternalChecked(true);
      }
    }
  }, [documentSlug, documentVersion, isControlled]);

  const handleChange = useCallback(
    async (newChecked: boolean) => {
      if (disabled) return;

      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      onChange?.(newChecked);

      // Persist consent to server if enabled and checking (not unchecking)
      if (persistOnCheck && newChecked) {
        setIsPersisting(true);
        try {
          await recordDocumentConsent({
            documentSlug,
            documentVersion,
            consentType: "EXPLICIT" as ConsentType,
            context,
          });
          onConsentRecorded?.();
        } catch (_error) {
        } finally {
          setIsPersisting(false);
        }
      }
    },
    [
      disabled,
      isControlled,
      onChange,
      persistOnCheck,
      documentSlug,
      documentVersion,
      context,
      onConsentRecorded,
    ],
  );

  // Default label with link to document
  const defaultLabel = (
    <>
      I agree to the{" "}
      <a
        href={`/${documentSlug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:text-primary-700 underline"
        onClick={(e) => e.stopPropagation()}
      >
        {documentTitle}
      </a>
      {required && <span className="text-red-500 ml-1">*</span>}
    </>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={disabled || isPersisting}
            required={required}
            className={`
              h-4 w-4 rounded border-gray-300 dark:border-gray-600
              text-primary-600 focus:ring-primary-600
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-red-500" : ""}
            `}
            aria-invalid={!!error}
            aria-describedby={error ? `${documentSlug}-error` : undefined}
          />
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
          {customLabel ?? defaultLabel}
          {isPersisting && <span className="ml-2 text-gray-400 text-xs">(saving...)</span>}
        </span>
      </label>
      {error && (
        <p
          id={`${documentSlug}-error`}
          className="mt-1 text-sm text-red-600 dark:text-red-400"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================
// Multi-Document Consent
// ============================================

export interface MultiConsentCheckboxProps {
  /** Documents to consent to */
  documents: Array<{
    slug: string;
    version?: string;
    required?: boolean;
  }>;
  /** Controlled checked state */
  checked?: boolean;
  /** Callback when checked state changes */
  onChange?: (checked: boolean) => void;
  /** Context for consent */
  context?: string;
  /** Whether to persist consent on check */
  persistOnCheck?: boolean;
  /** Custom label */
  label?: React.ReactNode;
  /** Custom class names */
  className?: string;
  /** Error message */
  error?: string;
  /** Disabled state */
  disabled?: boolean;
}

export function MultiConsentCheckbox({
  documents,
  checked: controlledChecked,
  onChange,
  context = "signup",
  persistOnCheck = false,
  label: customLabel,
  className = "",
  error,
  disabled = false,
}: MultiConsentCheckboxProps) {
  const [internalChecked, setInternalChecked] = useState(false);
  const [isPersisting, setIsPersisting] = useState(false);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = useCallback(
    async (newChecked: boolean) => {
      if (disabled) return;

      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      onChange?.(newChecked);

      // Persist consent for all documents
      if (persistOnCheck && newChecked) {
        setIsPersisting(true);
        try {
          await Promise.all(
            documents.map((doc) =>
              recordDocumentConsent({
                documentSlug: doc.slug,
                documentVersion: doc.version,
                consentType: "EXPLICIT",
                context,
              }),
            ),
          );
        } catch (_error) {
        } finally {
          setIsPersisting(false);
        }
      }
    },
    [disabled, isControlled, onChange, persistOnCheck, documents, context],
  );

  // Default label with links to all documents
  const defaultLabel = (
    <>
      I agree to the{" "}
      {documents.map((doc, index) => {
        const config = getDocumentConfig(doc.slug);
        const title = config?.metadata.title ?? doc.slug;
        const isLast = index === documents.length - 1;
        const isSecondToLast = index === documents.length - 2;

        return (
          <span key={doc.slug}>
            <a
              href={`/${doc.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 hover:text-primary-700 underline"
              onClick={(e) => e.stopPropagation()}
            >
              {title}
            </a>
            {!isLast && (isSecondToLast ? " and " : ", ")}
          </span>
        );
      })}
      {documents.some((d) => d.required !== false) && <span className="text-red-500 ml-1">*</span>}
    </>
  );

  return (
    <div className={`flex flex-col ${className}`}>
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="flex items-center h-5">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => handleChange(e.target.checked)}
            disabled={disabled || isPersisting}
            required={documents.some((d) => d.required !== false)}
            className={`
              h-4 w-4 rounded border-gray-300 dark:border-gray-600
              text-primary-600 focus:ring-primary-600
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? "border-red-500" : ""}
            `}
            aria-invalid={!!error}
          />
        </div>
        <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
          {customLabel ?? defaultLabel}
          {isPersisting && <span className="ml-2 text-gray-400 text-xs">(saving...)</span>}
        </span>
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default ConsentCheckbox;
