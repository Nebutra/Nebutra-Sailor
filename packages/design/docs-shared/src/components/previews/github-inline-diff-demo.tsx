import { GithubInlineDiff } from "@nebutra/ui/primitives";

export function GithubInlineDiffDemo() {
  const diff = [
    { kind: "hunk", content: "@@ -12,7 +12,9 @@" } as const,
    {
      kind: "context",
      old: 12,
      new: 12,
      content: "export function evaluateExpression(expr: string) {",
    } as const,
    {
      kind: "del",
      old: 13,
      new: null,
      content: "  // TODO: Add proper error handling",
    } as const,
    {
      kind: "del",
      old: 14,
      new: null,
      content: "  return eval(expr);",
    } as const,
    { kind: "add", old: null, new: 13, content: "  try {" } as const,
    {
      kind: "add",
      old: null,
      new: 14,
      content: "    // Using a safer alternative to eval in production",
    } as const,
    {
      kind: "add",
      old: null,
      new: 15,
      content: "    return safeEval(expr);",
    } as const,
    { kind: "add", old: null, new: 16, content: "  } catch (err) {" } as const,
    {
      kind: "add",
      old: null,
      new: 17,
      content: "    console.error('Invalid expression', err);",
    } as const,
    { kind: "add", old: null, new: 18, content: "    return null;" } as const,
    { kind: "add", old: null, new: 19, content: "  }" } as const,
    { kind: "context", old: 15, new: 20, content: "}" } as const,
  ];

  const initialComments = {
    6: [
      {
        id: "c1",
        author: "Security Team",
        initials: "ST",
        body: "Good catch replacing eval() here!",
        createdAt: "2d ago",
      },
    ],
  };

  return (
    <div className="max-w-3xl p-4 md:p-8 mx-auto w-full">
      <GithubInlineDiff
        diff={diff}
        fileName="src/utils/math.ts"
        fileStatus="modified"
        initialComments={initialComments}
      />
    </div>
  );
}
