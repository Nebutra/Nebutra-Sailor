"use client";

import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardIcon,
  CardTitle,
} from "@nebutra/ui/patterns";

export function CardWithIconDemo() {
  return (
    <Card variant="bordered" padding="md">
      <CardHeader>
        <CardIcon size="md">
          <span>⚡️</span>
        </CardIcon>
        <CardTitle>Fast Deployments</CardTitle>
      </CardHeader>
      <CardBody>
        <CardDescription>Deploy in seconds.</CardDescription>
      </CardBody>
    </Card>
  );
}
