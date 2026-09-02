import { AuthActions } from "@/components/AuthActions";
import { kuanlanSignInUrl } from "@/lib/auth-urls";

export function AuthGate({ variant = "nav" }: { variant?: "nav" | "cta" | "leave" }) {
  return <AuthActions signInHref={kuanlanSignInUrl("/me")} variant={variant} />;
}
