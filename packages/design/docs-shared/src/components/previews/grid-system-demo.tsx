import { Grid } from "@nebutra/ui/primitives";

const cells = [
  { label: "Signal", column: { sm: "1", md: "1/3" }, row: { sm: "1/3", md: "1/2" }, solid: true },
  {
    label: "Latency",
    column: { sm: "1", md: "3/4" },
    row: { sm: "3/4", md: "1/2" },
    solid: false,
  },
  {
    label: "Trace",
    column: { sm: "1", md: "1/2" },
    row: { sm: "4/5", md: "2/3" },
    solid: false,
  },
  {
    label: "Release health",
    column: { sm: "1", md: "2/4" },
    row: { sm: "5/7", md: "2/3" },
    solid: true,
  },
] as const;

export function GridSystemDemo() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold tracking-tight">Responsive guide grid</h3>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Guide lines belong to the grid system. Solid cells intentionally clip the guides behind
          dense content.
        </p>
      </div>

      <Grid.System debug guideWidth={1} unstable_useContainer>
        <Grid columns={{ sm: 1, md: 3 }} rows={{ sm: 6, md: 2 }}>
          {cells.map((cell) => (
            <Grid.Cell
              key={cell.label}
              column={cell.column}
              row={cell.row}
              solid={cell.solid}
              className="flex items-center justify-center text-center text-sm font-medium"
            >
              {cell.label}
            </Grid.Cell>
          ))}
        </Grid>
      </Grid.System>
    </div>
  );
}
