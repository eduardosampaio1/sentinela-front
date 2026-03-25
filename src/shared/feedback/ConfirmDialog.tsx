import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: "default" | "destructive";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const handleCancel = () => {
    onCancel?.();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0D1525] border-[rgba(255,255,255,0.08)] rounded-2xl max-w-md">
        <DialogHeader>
          <DialogTitle className="text-[#F1F5F9] font-semibold">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-[#94A3B8] text-sm leading-relaxed">
              {description}
            </DialogDescription>
          )}
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="ghost"
            onClick={handleCancel}
            disabled={loading}
            className="rounded-xl text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[rgba(255,255,255,0.06)]"
          >
            {cancelLabel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "rounded-xl",
              variant === "destructive"
                ? "bg-[rgba(248,113,113,0.15)] text-[#F87171] border border-[rgba(248,113,113,0.25)] hover:bg-[rgba(248,113,113,0.25)]"
                : "bg-[#22D3EE] text-[#070C18] hover:bg-[#06B6D4]"
            )}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 spinner" />
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
