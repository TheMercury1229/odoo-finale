"use client";

import type { ClientUploadedFileData } from "uploadthing/types";

import { UploadButton } from "@/lib/uploadthing";

interface ImageUploaderProps {
  onUploadComplete?: (file: ClientUploadedFileData<unknown>) => void;
}

export function ImageUploader({ onUploadComplete }: ImageUploaderProps) {
  return (
    <UploadButton
      endpoint="imageUploader"
      onClientUploadComplete={(files) => {
        const file = files?.[0];
        if (file) onUploadComplete?.(file);
      }}
      onUploadError={(error) => {
        console.error("Image upload failed", error);
      }}
    />
  );
}
