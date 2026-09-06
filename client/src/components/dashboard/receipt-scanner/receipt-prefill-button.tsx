"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  scanReceiptAction,
  type ExtractedReceiptData,
} from "@/actions/scan-receipt";

interface ReceiptPrefillButtonProps {
  onExtracted: (data: ExtractedReceiptData) => void;
  disabled?: boolean;
  className?: string;
  label?: string;
}

export function ReceiptPrefillButton({
  onExtracted,
  disabled = false,
  className,
  label = "Upload Receipt to Prefill",
}: ReceiptPrefillButtonProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleButtonClick = () => {
    setStatusMessage(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setStatusMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const result = await scanReceiptAction(formData);

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to scan receipt");
      }

      onExtracted(result.data);

      const linesCount = result.data.lines?.length || 0;
      const party = result.data.partyName ? ` from ${result.data.partyName}` : "";
      setStatusMessage({
        type: "success",
        text: `Extracted ${linesCount} line item${linesCount === 1 ? "" : "s"}${party}!`,
      });

      // Clear success notification after 5s
      setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Error scanning receipt";
      setStatusMessage({
        type: "error",
        text: message,
      });
    } finally {
      setIsScanning(false);
      // Reset input value so same file can be re-uploaded if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="inline-flex flex-col items-start gap-1.5">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        disabled={disabled || isScanning}
        className={className}
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin text-primary" />
            <span>Scanning with Gemini...</span>
          </>
        ) : (
          <>
            <Sparkles className="mr-2 size-4 text-amber-500 animate-pulse" />
            <span>{label}</span>
          </>
        )}
      </Button>

      {statusMessage && (
        <div
          className={`flex items-center gap-1.5 text-xs font-medium transition-all ${
            statusMessage.type === "success"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-destructive"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="size-3.5 shrink-0" />
          ) : (
            <AlertCircle className="size-3.5 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
