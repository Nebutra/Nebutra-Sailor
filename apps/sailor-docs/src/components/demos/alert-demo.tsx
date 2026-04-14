"use client";

import {
  Alert,
  AlertContent,
  AlertDescription,
  AlertIcon,
  AlertTitle,
} from "@nebutra/ui/primitives";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import { useState } from "react";

export function AlertDemo() {
  const [visible, setVisible] = useState(true);

  return (
    <div className="space-y-3 w-full max-w-2xl">
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

      {visible && (
        <Alert variant="info" appearance="light" close onClose={() => setVisible(false)}>
          <AlertIcon>
            <Info />
          </AlertIcon>
          <AlertContent>
            <AlertTitle>New features available</AlertTitle>
            <AlertDescription>
              We have launched an exciting new update. This alert is dismissible.
            </AlertDescription>
          </AlertContent>
        </Alert>
      )}
    </div>
  );
}
