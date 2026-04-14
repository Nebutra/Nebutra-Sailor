"use client";

import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@nebutra/ui/primitives";
import { AlertTriangleIcon } from "lucide-react";
import { useState } from "react";

export function DialogDeactivateDemo() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Deactivate</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <div className="flex items-start space-x-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertTriangleIcon className="h-6 w-6 text-red-600 dark:text-red-500" />
          </div>
          <DialogHeader className="text-left">
            <DialogTitle>Deactivate account</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate your account? All of your data will be permanently
              removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={() => setOpen(false)}>
            Deactivate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
