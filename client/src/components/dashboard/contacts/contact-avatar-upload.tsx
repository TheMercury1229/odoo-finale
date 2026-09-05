"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2, Upload } from "lucide-react";

import { useUploadThing } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

interface ContactAvatarUploadProps {
  name: string;
  value?: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CO";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ContactAvatarUpload({
  name,
  value,
  onChange,
  disabled = false,
}: ContactAvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      const file = res?.[0];
      const uploadedUrl =
        file?.ufsUrl ||
        file?.url ||
        file?.appUrl;

      if (uploadedUrl) {
        onChange(uploadedUrl);
        toast.add({
          type: "success",
          title: "Image uploaded",
          description: "Profile photo uploaded. Click Save Changes to apply.",
        });
      } else {
        console.error("No URL found in upload response:", res);
        toast.add({
          type: "error",
          title: "Upload error",
          description: "Uploaded successfully, but no URL was returned.",
        });
      }
    },
    onUploadError: (err) => {
      console.error("Image upload failed", err);
      toast.add({
        type: "error",
        title: "Upload failed",
        description: err.message || "Failed to upload image. Please try again.",
      });
    },
  });

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0 || disabled || isUploading) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      toast.add({
        type: "error",
        title: "Invalid file",
        description: "Please select an image file (JPG, PNG, WebP, etc.).",
      });
      return;
    }
    await startUpload([file]);
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled || isUploading) return;
    await handleFileSelect(e.dataTransfer.files);
  };

  const initials = getInitials(name || "Contact");

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={disabled || isUploading}
        onChange={(e) => {
          handleFileSelect(e.target.files);
          e.target.value = "";
        }}
      />

      {/* Interactive Avatar / Drop Zone */}
      <div
        className={cn(
          "group relative flex size-28 cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed transition-all duration-200",
          isDragOver
            ? "border-primary bg-primary/5 scale-105"
            : "border-muted-foreground/25 hover:border-primary/60 bg-muted/30",
          disabled && "cursor-not-allowed opacity-50",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!disabled && !isUploading) fileInputRef.current?.click();
        }}
        title="Click or drag image to change photo"
      >
        <Avatar className="size-24 rounded-xl border shadow-sm">
          {value ? (
            <AvatarImage
              src={value}
              alt={name}
              className="size-full rounded-xl object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 text-lg font-semibold text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Overlay on hover or when uploading */}
        {isUploading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur-xs">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span className="mt-1 text-[11px] font-medium text-foreground">
              Uploading...
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex flex-col items-center text-white">
              <Camera className="size-5" />
              <span className="text-[10px] font-medium">Change</span>
            </div>
          </div>
        )}

        {/* Camera badge indicator at bottom-right */}
        {!isUploading && (
          <div className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs group-hover:border-primary group-hover:text-primary">
            <Camera className="size-3.5" />
          </div>
        )}
      </div>

      {/* Action Buttons & Guidance */}
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={disabled || isUploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Upload className="size-3.5" />
            )}
            {value ? "Change Photo" : "Upload Photo"}
          </Button>

          {value ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={disabled || isUploading}
              onClick={() => onChange("")}
            >
              <Trash2 className="size-3.5" />
              Remove
            </Button>
          ) : null}
        </div>
        <p className="text-[11px] text-muted-foreground">
          PNG, JPG or WebP up to 8MB. Drag & drop supported.
        </p>
      </div>
    </div>
  );
}
