"use client";

import {
  Card,
  CardBody,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@nebutra/ui/patterns";
import { Button } from "@nebutra/ui/primitives";
export function Card2Demo() {
  return (
    <Card variant="gradient" padding="lg">
      <CardHeader>
        <CardTitle>Pro Plan</CardTitle>
        <CardDescription>Everything you need to ship faster.</CardDescription>
      </CardHeader>
      <CardBody>
        <p className="text-3xl font-bold">
          $49
          <span className="text-base font-normal text-muted-foreground">/mo</span>
        </p>
      </CardBody>
      <CardFooter>
        <Button className="w-full">Get started</Button>
      </CardFooter>
    </Card>
  );
}
