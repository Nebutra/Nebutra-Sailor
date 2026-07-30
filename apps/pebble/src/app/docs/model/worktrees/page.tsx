import type { Metadata } from "next";

export const metadata: Metadata = { title: "Parallel worktrees" };

export default function Page() {
  return (
    <>
      <h1>Parallel worktrees</h1>
      <p>
        Fan one prompt across multiple agents, each in its own isolated git worktree — compare
        results and merge the winner.
      </p>
      <p>
        Worktrees keep experiments off your primary checkout so you can run several agents without
        stomping each other. Pebble tracks each worktree as a first-class workspace card.
      </p>
    </>
  );
}
