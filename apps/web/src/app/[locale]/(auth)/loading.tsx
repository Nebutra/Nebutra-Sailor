import { AuthSplitLayout } from "@/components/auth/auth-split-layout";

export default function AuthLoading() {
  return (
    <AuthSplitLayout>
      <div className="space-y-4" aria-busy="true" aria-live="polite">
        <div className="space-y-2">
          <div className="h-8 w-44 rounded-md bg-muted" />
          <div className="h-4 w-28 rounded-md bg-muted/70" />
        </div>
        <div className="h-10 rounded-xl bg-muted" />
        <div className="h-10 rounded-xl bg-muted/70" />
        <div className="h-11 rounded-xl bg-muted" />
      </div>
    </AuthSplitLayout>
  );
}
