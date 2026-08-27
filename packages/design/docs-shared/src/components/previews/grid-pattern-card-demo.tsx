import { Button, GridPatternCard, GridPatternCardBody } from "@nebutra/ui/primitives";

export function GridPatternCardDemo() {
  return (
    <div className="md:grid-cols-2 gap-8 max-w-4xl p-4 md:p-8 mx-auto grid w-full grid-cols-1">
      <GridPatternCard gradientClassName="from-blue-50/90 via-blue-50/40 to-blue-50/10 dark:from-sky-950/90 dark:via-sky-950/40 dark:to-sky-950/10">
        <GridPatternCardBody className="gap-4 flex h-[250px] flex-col justify-between">
          <div>
            <span className="px-3 py-1 bg-blue-100 dark:text-blue-300 text-xs font-semibold mb-4 border-blue-200 dark:border-blue-800 inline-block rounded-full border text-blue-700 dark:bg-blue-900">
              New Output
            </span>
            <h3 className="text-xl font-bold tracking-tight mb-2">Build faster with AI</h3>
            <p className="text-sm max-w-xs text-muted-foreground">
              Generate entire applications, UI components, and API routes using natural language.
            </p>
          </div>
          <div>
            <Button size="sm" variant="outline" className="backdrop-blur bg-background/80">
              Try it out
            </Button>
          </div>
        </GridPatternCardBody>
      </GridPatternCard>

      <GridPatternCard>
        <GridPatternCardBody className="gap-4 flex h-[250px] flex-col items-center justify-center text-center">
          <div className="p-4 mb-2 rounded-full bg-primary/10 text-primary">
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v20" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold tracking-tight">Financial Dashboard</h3>
          <p className="text-sm max-w-[250px] text-muted-foreground">
            Connect your bank accounts and manage your expenses with intelligent insights.
          </p>
        </GridPatternCardBody>
      </GridPatternCard>
    </div>
  );
}
