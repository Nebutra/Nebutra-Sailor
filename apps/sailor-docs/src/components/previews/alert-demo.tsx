"use client";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@nebutra/ui/primitives";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

export function AlertDemo() {
  return (
    <div className="space-y-3 max-w-2xl w-full">
      <Alert variant="success" appearance="light">
        <AlertIcon>
          <CircleCheck />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>Operation successful!</AlertTitle>
          <AlertDescription>Your changes have been saved.</AlertDescription>
        </AlertContent>
      </Alert>

      <Alert variant="destructive" appearance="light">
        <AlertIcon>
          <CircleAlert />
        </AlertIcon>
        <AlertContent>
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>Please try again or contact support.</AlertDescription>
        </AlertContent>
      </Alert>

      <Alert variant="warning" appearance="light">
        <AlertIcon>
          <TriangleAlert />
        </AlertIcon>
        <AlertTitle>Storage almost full</AlertTitle>
      </Alert>

      <Alert variant="info" appearance="light">
        <AlertIcon>
          <Info />
        </AlertIcon>
        <AlertTitle>New features available</AlertTitle>
      </Alert>
    </div>
  );
}
