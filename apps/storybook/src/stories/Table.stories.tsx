import { ShowMore, Table } from "@nebutra/ui/primitives";
import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

const meta: Meta<typeof Table> = {
  title: "Primitives/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Semantic HTML table primitive for comparable tabular data. Use Entity for action rows and Description for key/value metadata.",
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Table>;

const simpleRows = [
  ["Value 1.1", "Value 1.2", "Value 1.3"],
  ["Value 2.1", "Value 2.2", "Value 2.3"],
  ["Value 3.1", "Value 3.2", "Value 3.3"],
] as const;

const items = [
  { product: "Brake Pads Set", usage: "100 sets", price: "$50 per set", charge: 5000 },
  { product: "Oil Filters", usage: "200 filters", price: "$10 per filter", charge: 2000 },
  { product: "Car Batteries", usage: "50 batteries", price: "$100 per battery", charge: 5000 },
  { product: "Headlight Bulbs", usage: "300 bulbs", price: "$15 per bulb", charge: 4500 },
  { product: "Windshield Wipers", usage: "250 pairs", price: "$20 per pair", charge: 5000 },
  { product: "Spark Plugs", usage: "500 sets", price: "$5 per set", charge: 2500 },
] as const;

const formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  maximumFractionDigits: 2,
  currency: "USD",
});

function formatCurrency(amount: number) {
  return formatter.format(amount);
}

function BasicTable({
  striped,
  bordered,
  interactive,
}: {
  striped?: boolean;
  bordered?: boolean;
  interactive?: boolean;
}) {
  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.Head>Col 1</Table.Head>
          <Table.Head>Col 2</Table.Head>
          <Table.Head>Col 3</Table.Head>
        </Table.Row>
      </Table.Header>
      <Table.Body bordered={bordered} interactive={interactive} striped={striped}>
        {simpleRows.map((row) => (
          <Table.Row key={row[0]}>
            {row.map((cell) => (
              <Table.Cell key={cell}>{cell}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  );
}

function InvoiceTable({ virtualized = false }: { virtualized?: boolean }) {
  const [expanded, setExpanded] = React.useState(false);
  const tableId = React.useId();
  const visibleItems = virtualized && !expanded ? items.slice(0, 3) : items;
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div className="relative w-full max-w-3xl">
      <Table id={tableId}>
        <Table.Colgroup>
          <Table.Col className="w-[44%]" />
          <Table.Col className="w-[22%]" />
          <Table.Col className="w-[22%]" />
          <Table.Col className="w-[12%]" />
        </Table.Colgroup>
        <Table.Header>
          <Table.Row>
            <Table.Head>Product</Table.Head>
            <Table.Head>Usage</Table.Head>
            <Table.Head>Price</Table.Head>
            <Table.Head numeric>Charge</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body bordered interactive striped virtualize={virtualized}>
          {visibleItems.map((item) => (
            <Table.Row key={item.product}>
              <Table.Cell>{item.product}</Table.Cell>
              <Table.Cell>{item.usage}</Table.Cell>
              <Table.Cell>{item.price}</Table.Cell>
              <Table.Cell numeric>{formatCurrency(item.charge)}</Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
        {!virtualized && (
          <Table.Footer>
            <Table.Row>
              <Table.Cell className="font-medium text-foreground" colSpan={3}>
                Subtotal
              </Table.Cell>
              <Table.Cell className="font-medium text-foreground" numeric>
                {formatCurrency(items.reduce((sum, item) => sum + item.charge, 0))}
              </Table.Cell>
            </Table.Row>
          </Table.Footer>
        )}
      </Table>
      {virtualized && hiddenCount > 0 ? (
        <div className="absolute inset-x-0 bottom-3">
          <ShowMore
            className="pointer-events-auto"
            controls={tableId}
            expanded={expanded}
            hiddenCount={hiddenCount}
            noBorder
            onExpandedChange={setExpanded}
          />
        </div>
      ) : null}
    </div>
  );
}

export const Basic: Story = {
  render: () => <BasicTable />,
};

export const Striped: Story = {
  render: () => <BasicTable striped />,
};

export const Bordered: Story = {
  render: () => <BasicTable bordered />,
};

export const Interactive: Story = {
  render: () => <BasicTable interactive />,
};

export const FullFeatured: Story = {
  render: () => <InvoiceTable />,
};

export const VirtualizedPreview: Story = {
  render: () => <InvoiceTable virtualized />,
};
