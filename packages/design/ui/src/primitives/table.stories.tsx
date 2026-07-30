import type { Meta, StoryObj } from "@storybook/react";
import { Table } from "./table";

const meta = {
  title: "Primitives/Table",
  component: Table,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Semantic table primitive with compound API, row states, numeric alignment, and tokenized density.",
      },
    },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

const rows = [
  { region: "iad1", requests: 128_420, errorRate: "0.08%" },
  { region: "sfo1", requests: 84_120, errorRate: "0.12%" },
  { region: "sin1", requests: 63_002, errorRate: "0.04%" },
];

export const Default: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <Table.Caption>API traffic by region.</Table.Caption>
      <Table.Header>
        <Table.Row>
          <Table.Head>Region</Table.Head>
          <Table.Head numeric>Requests</Table.Head>
          <Table.Head numeric>Error rate</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body bordered interactive>
        {rows.map((row) => (
          <Table.Row key={row.region}>
            <Table.Cell>{row.region}</Table.Cell>
            <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
            <Table.Cell numeric>{row.errorRate}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

export const Striped: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <Table.Header>
        <Table.Row>
          <Table.Head>Region</Table.Head>
          <Table.Head numeric>Requests</Table.Head>
          <Table.Head numeric>Error rate</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body striped>
        {rows.map((row) => (
          <Table.Row key={row.region}>
            <Table.Cell>{row.region}</Table.Cell>
            <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
            <Table.Cell numeric>{row.errorRate}</Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  ),
};

/**
 * `bare` drops the container's own surface, border, radius, inset padding and
 * header/body spacer so the rows sit flush with an enclosing panel instead of
 * being double-framed. This is the shape every settings/directory table in
 * `apps/web` needs.
 */
export const BareInsidePanel: Story = {
  render: () => (
    <div className="w-[36rem] overflow-hidden rounded-[var(--radius-xl)] border border-border">
      <Table
        bare
        wrapperStyle={{ "--table-cell-padding-x": "1rem", "--table-cell-padding-y": "0.75rem" }}
      >
        <Table.Header className="bg-muted">
          <Table.Row>
            <Table.Head>Region</Table.Head>
            <Table.Head numeric>Requests</Table.Head>
            <Table.Head numeric>Error rate</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body bordered>
          {rows.map((row) => (
            <Table.Row key={row.region}>
              <Table.Cell>{row.region}</Table.Cell>
              <Table.Cell numeric>{row.requests.toLocaleString()}</Table.Cell>
              <Table.Cell numeric>{row.errorRate}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table>
    </div>
  ),
};

/**
 * The last column is right-aligned by default because it is usually the action
 * or value column. `alignment` opts a cell out — a plain `text-left` class
 * cannot, because the implicit rule is keyed on `:last-child`.
 */
export const LastColumnAlignment: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <Table.Header>
        <Table.Row>
          <Table.Head>Rule</Table.Head>
          <Table.Head>On request</Table.Head>
          <Table.Head alignment="start">Notes</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body bordered>
        <Table.Row>
          <Table.Cell>read</Table.Cell>
          <Table.Cell>allow</Table.Cell>
          <Table.Cell alignment="start">Reads never prompt.</Table.Cell>
        </Table.Row>
        <Table.Row>
          <Table.Cell>write</Table.Cell>
          <Table.Cell>prompt</Table.Cell>
          <Table.Cell alignment="start">Escalates to the operator.</Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};

/** A single full-width cell — e.g. an empty state — centred rather than right-aligned. */
export const EmptyState: Story = {
  render: () => (
    <Table className="w-[36rem]">
      <Table.Header>
        <Table.Row>
          <Table.Head>Region</Table.Head>
          <Table.Head numeric>Requests</Table.Head>
          <Table.Head numeric>Error rate</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        <Table.Row>
          <Table.Cell alignment="center" colSpan={3} className="py-8 text-muted-foreground">
            No regions are reporting traffic for this window.
          </Table.Cell>
        </Table.Row>
      </Table.Body>
    </Table>
  ),
};
