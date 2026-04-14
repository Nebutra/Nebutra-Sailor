"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  Label,
  Spinner,
} from "@nebutra/ui/primitives";
import { AlertCircle, CheckCircle, FileText, Plus, Trash2, XCircle } from "lucide-react";

export function CopywritingErrorsDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 overflow-hidden">
        <div className="p-3 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-2 font-medium text-sm border-b border-red-200 dark:border-red-900/30">
          <XCircle className="w-4 h-4" />
          Wrong (Vague)
        </div>
        <div className="p-6 flex items-center justify-center">
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>Something went wrong.</AlertDescription>
          </Alert>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 overflow-hidden">
        <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex items-center gap-2 font-medium text-sm border-b border-green-200 dark:border-green-900/30">
          <CheckCircle className="w-4 h-4" />
          Correct (Direct, Actionable)
        </div>
        <div className="p-6 flex items-center justify-center">
          <Alert variant="destructive" className="w-full">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Payment failed</AlertTitle>
            <AlertDescription>
              Your payment could not be processed. Check your card details and try again.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
}

export function CopywritingEmptyStateDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 overflow-hidden">
        <div className="p-3 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-2 font-medium text-sm border-b border-red-200 dark:border-red-900/30">
          <XCircle className="w-4 h-4" />
          Wrong (Apathetic)
        </div>
        <div className="p-6 flex flex-col items-center justify-center py-12 text-center border mt-4 mx-4 border-dashed rounded-lg bg-fd-background">
          <FileText className="w-10 h-10 text-fd-muted-foreground mb-4 opacity-50" />
          <h3 className="text-lg font-medium text-fd-foreground">No projects found.</h3>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 overflow-hidden">
        <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex items-center gap-2 font-medium text-sm border-b border-green-200 dark:border-green-900/30">
          <CheckCircle className="w-4 h-4" />
          Correct (Action-oriented)
        </div>
        <div className="p-6 flex flex-col items-center justify-center py-12 text-center border mt-4 mx-4 border-dashed rounded-lg bg-fd-background">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-fd-foreground mb-1">Create your first project</h3>
          <p className="text-sm text-fd-muted-foreground mb-4 max-w-[200px]">
            Get started by setting up a new project space.
          </p>
          <Button>Create project</Button>
        </div>
      </div>
    </div>
  );
}

export function CopywritingSuccessDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 overflow-hidden">
        <div className="p-3 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-2 font-medium text-sm border-b border-red-200 dark:border-red-900/30">
          <XCircle className="w-4 h-4" />
          Wrong (Verbose, Hollow)
        </div>
        <div className="p-8 flex items-center justify-center w-full h-full min-h-[140px]">
          <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-sm text-green-800 dark:text-green-300 shadow-sm w-full">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
            <span>Your file has been successfully deleted!</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 overflow-hidden">
        <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex items-center gap-2 font-medium text-sm border-b border-green-200 dark:border-green-900/30">
          <CheckCircle className="w-4 h-4" />
          Correct (Brief, Factual)
        </div>
        <div className="p-8 flex items-center justify-center w-full h-full min-h-[140px]">
          <div className="flex items-center gap-3 px-4 py-3 bg-fd-card border border-fd-border rounded-md text-sm text-fd-foreground shadow-sm w-full">
            <Trash2 className="w-4 h-4 text-fd-muted-foreground shrink-0" />
            <span>File deleted.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CopywritingDestructiveDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 overflow-hidden">
        <div className="p-3 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-2 font-medium text-sm border-b border-red-200 dark:border-red-900/30">
          <XCircle className="w-4 h-4" />
          Wrong (Alarming, Unclear Actions)
        </div>
        <div className="p-6 flex items-center justify-center bg-black/5 dark:bg-black/40">
          <Card className="w-full shadow-lg">
            <CardHeader className="pb-3 text-red-600">
              <h3 className="font-semibold text-lg leading-none tracking-tight">
                WARNING! DELETING PROJECT
              </h3>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-fd-muted-foreground">
                Are you absolutely sure you want to do this? Once you delete it, it is gone forever
                and you will lose everything.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline">Back</Button>
                <Button variant="destructive">Yes, delete it</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 overflow-hidden">
        <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex items-center gap-2 font-medium text-sm border-b border-green-200 dark:border-green-900/30">
          <CheckCircle className="w-4 h-4" />
          Correct (Calm, Precise, Exact Actions)
        </div>
        <div className="p-6 flex items-center justify-center bg-black/5 dark:bg-black/40">
          <Card className="w-full shadow-lg">
            <CardHeader className="pb-3">
              <h3 className="font-semibold text-lg leading-none tracking-tight">Delete project?</h3>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-fd-muted-foreground">
                This cannot be undone. All tasks, files, and history will be permanently removed.
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline">Cancel</Button>
                <Button variant="destructive">Delete project</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function CopywritingButtonsDemo() {
  return (
    <div className="w-full my-6 rounded-lg border border-fd-border overflow-hidden bg-fd-card">
      <div className="p-4 border-b border-fd-border font-medium text-sm">Button Label Matching</div>
      <div className="p-6">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-fd-foreground">Edit Profile</h4>
            <div className="grid grid-cols-2 gap-4 items-end">
              <div className="space-y-2">
                <Label className="text-xs text-fd-muted-foreground flex items-center gap-1.5">
                  <XCircle className="w-3 h-3 text-red-500" /> Wrong (Generic)
                </Label>
                <Button className="w-full">Submit</Button>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-fd-muted-foreground flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 text-green-500" /> Correct (Verb-Noun)
                </Label>
                <Button className="w-full">Save changes</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CopywritingProgressDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full my-6">
      <div className="flex flex-col rounded-lg border border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10 overflow-hidden">
        <div className="p-3 bg-red-100/50 dark:bg-red-900/20 text-red-800 dark:text-red-300 flex items-center gap-2 font-medium text-sm border-b border-red-200 dark:border-red-900/30">
          <XCircle className="w-4 h-4" />
          Wrong (Unspecific)
        </div>
        <div className="p-12 flex flex-col items-center justify-center">
          <Spinner size="md" className="mb-4 text-fd-muted-foreground" />
          <span className="text-sm font-medium text-fd-muted-foreground">Loading...</span>
        </div>
      </div>

      <div className="flex flex-col rounded-lg border border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10 overflow-hidden">
        <div className="p-3 bg-green-100/50 dark:bg-green-900/20 text-green-800 dark:text-green-300 flex items-center gap-2 font-medium text-sm border-b border-green-200 dark:border-green-900/30">
          <CheckCircle className="w-4 h-4" />
          Correct (Specific Action)
        </div>
        <div className="p-12 flex flex-col items-center justify-center">
          <Spinner size="md" className="mb-4 text-primary" />
          <span className="text-sm font-medium text-fd-foreground">Analyzing 3,400 records...</span>
        </div>
      </div>
    </div>
  );
}

export function CopywritingCapitalizationDemo() {
  return (
    <div className="w-full my-6 rounded-lg border border-fd-border overflow-hidden bg-fd-card">
      <div className="p-4 border-b border-fd-border font-medium text-sm">
        Sentence Case vs Title Case
      </div>
      <div className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-fd-border bg-fd-muted/30">
              <th className="py-3 px-4 text-left font-medium text-fd-muted-foreground">Element</th>
              <th className="py-3 px-4 text-left font-medium text-red-500">Don't (Title Case)</th>
              <th className="py-3 px-4 text-left font-medium text-green-500">Do (Sentence case)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-fd-border">
            <tr>
              <td className="py-3 px-4 text-fd-foreground font-medium">Button</td>
              <td className="py-3 px-4">
                <Button variant="outline" size="sm">
                  Save Changes
                </Button>
              </td>
              <td className="py-3 px-4">
                <Button variant="outline" size="sm">
                  Save changes
                </Button>
              </td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-fd-foreground font-medium">Heading</td>
              <td className="py-3 px-4 text-lg font-bold">Billing Information</td>
              <td className="py-3 px-4 text-lg font-bold">Billing information</td>
            </tr>
            <tr>
              <td className="py-3 px-4 text-fd-foreground font-medium">Checkbox</td>
              <td className="py-3 px-4 flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-primary shrink-0 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-primary" />
                </div>{" "}
                Keep Me Logged In
              </td>
              <td className="py-3 px-4 flex items-center gap-2">
                <div className="w-4 h-4 rounded border border-primary shrink-0 flex items-center justify-center">
                  <CheckCircle className="w-3 h-3 text-primary" />
                </div>{" "}
                Keep me logged in
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
