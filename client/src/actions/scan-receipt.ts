"use server";

import { GoogleGenAI } from "@google/genai";

export interface ExtractedReceiptLine {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number | null;
}

export interface ExtractedReceiptData {
  partyName: string | null;
  date: string | null;
  referenceNumber: string | null;
  lines: ExtractedReceiptLine[];
  notes: string | null;
}

export interface ScanReceiptResult {
  success: boolean;
  data?: ExtractedReceiptData;
  error?: string;
}

export async function scanReceiptAction(
  formData: FormData,
): Promise<ScanReceiptResult> {
  try {
    const file = formData.get("file") as File | null;

    if (!file || !(file instanceof File)) {
      return { success: false, error: "No file was uploaded." };
    }

    if (file.size > 15 * 1024 * 1024) {
      return {
        success: false,
        error: "File size exceeds maximum allowed limit of 15MB.",
      };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "GEMINI_API_KEY is not configured in server environment.",
      };
    }

    // Determine MIME type
    let mimeType = file.type;
    if (!mimeType || mimeType === "application/octet-stream") {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext === "png") mimeType = "image/png";
      else if (ext === "webp") mimeType = "image/webp";
      else if (ext === "pdf") mimeType = "application/pdf";
      else mimeType = "image/jpeg";
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
You are an expert ERP accounting data extractor.
Analyze this invoice, receipt, purchase order, or bill document.
Extract the relevant commercial transaction fields accurately into JSON.

Rules:
1. "partyName": Vendor/Supplier name (if this is a purchase/bill) OR Customer name (if this is a sales invoice).
2. "date": Transaction or invoice date formatted strictly as "YYYY-MM-DD" (e.g. 2026-03-15). If only month/day/year are present, convert to YYYY-MM-DD. If missing, return null.
3. "referenceNumber": Invoice number, bill number, PO number, or receipt reference (e.g. "INV-1092" or "PO004").
4. "lines": Array of individual purchased/sold item lines.
   - "description": Clear product or service name.
   - "quantity": Number of units (must be numeric float/int, default to 1 if not stated).
   - "unitPrice": Price per single unit (numeric float).
   - "taxRate": Tax percentage if stated (e.g. 5, 12, 18, 0, or null).
5. "notes": Brief memo or payment terms if present.

Return ONLY a valid JSON object matching this schema:
{
  "partyName": string | null,
  "date": string | null,
  "referenceNumber": string | null,
  "lines": [
    {
      "description": string,
      "quantity": number,
      "unitPrice": number,
      "taxRate": number | null
    }
  ],
  "notes": string | null
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const responseText = response.text?.trim();
    if (!responseText) {
      return {
        success: false,
        error: "Gemini did not return any readable content from the document.",
      };
    }

    const parsed = JSON.parse(responseText) as ExtractedReceiptData;

    // Validate and sanitize data
    const sanitizedLines: ExtractedReceiptLine[] = Array.isArray(parsed.lines)
      ? parsed.lines
          .filter((l) => l && typeof l === "object")
          .map((l) => ({
            description: String(l.description || "Unspecified Item").trim(),
            quantity: Math.max(0.01, Number(l.quantity) || 1),
            unitPrice: Math.max(0, Number(l.unitPrice) || 0),
            taxRate: l.taxRate != null ? Number(l.taxRate) : null,
          }))
      : [];

    return {
      success: true,
      data: {
        partyName: parsed.partyName || null,
        date: parsed.date || null,
        referenceNumber: parsed.referenceNumber || null,
        lines: sanitizedLines,
        notes: parsed.notes || null,
      },
    };
  } catch (err: unknown) {
    console.error("Error in scanReceiptAction:", err);
    const message =
      err instanceof Error ? err.message : "Failed to scan document";
    return { success: false, error: message };
  }
}
