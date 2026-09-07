"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "sm:max-w-3xl",
}: ModalProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className={`max-h-[90vh] w-full flex flex-col p-0 overflow-hidden bg-card border border-border shadow-2xl rounded-2xl ${maxWidth}`}
      >
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/40 shrink-0">
          <DialogTitle className="text-base font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default Modal;
