import { AuthActions } from "@/components/AuthActions";
import { kuanlanSignInUrl } from "@/lib/auth-urls";

export function AuthGate({
  variant = "nav",
  returnPath,
}: {
  variant?: "nav" | "cta" | "leave";
  returnPath?: string;
}) {
  return (
    <AuthActions
      signInHref={returnPath ? kuanlanSignInUrl(returnPath) : undefined}
      variant={variant}
    />
  );
}
