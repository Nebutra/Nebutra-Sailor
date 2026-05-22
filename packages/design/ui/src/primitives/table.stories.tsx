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
