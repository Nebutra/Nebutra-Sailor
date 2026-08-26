"use client";

import { Button } from "@nebutra/ui/primitives";
import { cn } from "@nebutra/ui/utils";
import { useState } from "react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "github",
    name: "GitHub",
    description: "Code & deploys",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.572C20.565 21.795 24 17.298 24 12c0-6.627-5.373-12-12-12z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    id: "slack",
    name: "Slack",
    description: "Team alerts",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#4A154B" />
        <text x="5" y="17" fontSize="13" fontWeight="bold" fill="white">
          S
        </text>
      </svg>
    ),
  },
  {
    id: "linear",
    name: "Linear",
    description: "Issue tracking",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#5E6AD2" />
        <text x="6" y="17" fontSize="13" fontWeight="bold" fill="white">
          L
        </text>
      </svg>
    ),
  },
  {
    id: "vercel",
    name: "Vercel",
    description: "Deploy previews",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2L24 22H0L12 2z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "jira",
    name: "Jira",
    description: "Project management",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden fill="none">
        <rect width="24" height="24" rx="4" fill="#0052CC" />
        <text x="7" y="17" fontSize="13" fontWeight="bold" fill="white">
          J
        </text>
      </svg>
    ),
  },
];

interface ConnectIntegrationsStepProps {
  onComplete: () => void;
}

export function ConnectIntegrationsStep({ onComplete }: ConnectIntegrationsStepProps) {
  const [connected, setConnected] = useState<Set<string>>(new Set());

  function handleConnect(id: string) {
    setConnected((prev) => new Set([...prev, id]));
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Connect your tools</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set up integrations to supercharge your workflow.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {INTEGRATIONS.map((integration) => {
          const isConnected = connected.has(integration.id);
          return (
            <div
              key={integration.id}
              className={cn(
                "flex flex-col gap-3 rounded-[var(--radius-xl)] border p-4 transition-colors",
                isConnected
                  ? "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)]"
                  : "border-border bg-card hover:border-border/80",
              )}
            >
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center">{integration.icon}</div>
              </div>
              <div>
                <p className="text-sm font-medium">{integration.name}</p>
                <p className="text-xs text-muted-foreground">{integration.description}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => !isConnected && handleConnect(integration.id)}
                disabled={isConnected}
              >
                {isConnected ? (
                  <span className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Connected
                  </span>
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={onComplete}
      >
        Skip for now → Go to Dashboard
      </Button>
    </div>
  );
}
