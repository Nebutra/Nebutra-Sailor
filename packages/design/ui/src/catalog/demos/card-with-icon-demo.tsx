"use client";

import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardIcon,
  CardTitle,
} from "@nebutra/ui/primitives";

export function CardWithIconDemo() {
  return (
    <Card variant="outline" padding="md">
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
