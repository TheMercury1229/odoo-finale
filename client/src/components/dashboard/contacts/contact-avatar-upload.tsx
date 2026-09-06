"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";

import { useUploadThing } from "@/lib/uploadthing";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
          description: "Profile photo uploaded successfully.",
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
    <div className="relative shrink-0">
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

      {/* Circular Avatar Trigger */}
      <div
        role="button"
        tabIndex={disabled || isUploading ? -1 : 0}
        aria-label="Upload profile photo"
        className={cn(
          "group relative flex size-14 cursor-pointer select-none items-center justify-center rounded-full transition-transform duration-200",
          isDragOver && "scale-105 ring-2 ring-primary",
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
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !isUploading) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        title="Click or drag image to change photo"
      >
        <Avatar className="size-14 rounded-full border-2 border-border shadow-xs">
          {value ? (
            <AvatarImage
              src={value}
              alt={name || "Contact"}
              className="size-full rounded-full object-cover"
            />
          ) : null}
          <AvatarFallback className="rounded-full bg-muted/80 text-sm font-semibold text-muted-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* Uploading Spinner Overlay */}
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80 backdrop-blur-xs">
            <Loader2 className="size-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-4 text-white" />
            </div>

            {/* Camera Badge at Bottom-Right */}
            <div className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-xs group-hover:scale-110 transition-transform">
              <Camera className="size-2.5" />
            </div>
          </>
        )}
      </div>

      {/* Remove Photo Button */}
      {value && !isUploading && !disabled ? (
        <button
          type="button"
          className="absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full border-2 border-background bg-destructive text-destructive-foreground opacity-0 shadow-xs transition-opacity hover:scale-110 hover:opacity-100 group-hover:opacity-100 focus:opacity-100"
          title="Remove photo"
          aria-label="Remove photo"
          onClick={(e) => {
            e.stopPropagation();
            onChange("");
          }}
        >
          <X className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
