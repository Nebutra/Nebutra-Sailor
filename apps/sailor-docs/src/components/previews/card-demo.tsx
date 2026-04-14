"use client";

import { Card, CardBody } from "@nebutra/ui/patterns";
import { Button, CardDescription, CardFooter, CardHeader, CardTitle } from "@nebutra/ui/primitives";
export function CardDemo() {
  return (
    <Card variant="default" padding="md">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
      </CardHeader>
      <CardBody>
        <CardDescription>Launch your next big idea securely.</CardDescription>
      </CardBody>
      <CardFooter className="gap-2 flex justify-end">
        <Button variant="outline">Cancel</Button>
        <Button>Create</Button>
      </CardFooter>
    </Card>
  );
}
