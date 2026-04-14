import { Grid } from "@nebutra/ui/primitives";

export function GridSystemDemo() {
  return (
    <div className="max-w-4xl p-4 md:p-8 gap-12 mx-auto flex w-full flex-col">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">12-Column Layout</h3>
        <Grid.System columns={12} rowHeight="80px" className="border">
          <Grid.Cell
            span={12}
            solid
            className="text-sm font-medium flex items-center justify-center"
          >
            Header (span 12, solid)
          </Grid.Cell>

          <Grid.Cell
            span={3}
            className="text-sm flex items-center justify-center text-muted-foreground"
          >
            Sidebar (span 3)
          </Grid.Cell>
          <Grid.Cell
            span={6}
            className="text-sm p-4 flex items-center justify-center text-center text-muted-foreground"
          >
            Main Content Area (span 6)
            <br />
            Shows grid background
          </Grid.Cell>
          <Grid.Cell
            span={3}
            className="text-sm flex items-center justify-center text-muted-foreground"
          >
            Widgets (span 3)
          </Grid.Cell>

          <Grid.Cell
            span={4}
            solid
            className="text-sm font-medium flex items-center justify-center"
          >
            Card 1 (span 4, solid)
          </Grid.Cell>
          <Grid.Cell
            span={4}
            solid
            className="text-sm font-medium flex items-center justify-center"
          >
            Card 2 (span 4, solid)
          </Grid.Cell>
          <Grid.Cell
            span={4}
            solid
            className="text-sm font-medium flex items-center justify-center"
          >
            Card 3 (span 4, solid)
          </Grid.Cell>

          <Grid.Cell
            span={12}
            className="text-sm flex items-center justify-center text-muted-foreground"
          >
            Footer (span 12)
          </Grid.Cell>
        </Grid.System>
      </div>
    </div>
  );
}
