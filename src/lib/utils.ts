import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function addDays(date: Date | string, days: number): Date {
  const d = typeof date === "string" ? new Date(date) : new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function daysBetween(from: Date | string, to: Date | string): number {
  const a = typeof from === "string" ? new Date(from) : from;
  const b = typeof to === "string" ? new Date(to) : to;
  const diff = b.getTime() - a.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function today(): string {
  return toISODate(new Date());
}

export function stripRtf(str: string | null | undefined): string {
  if (!str) return "";
  if (typeof str !== "string") return String(str);
  if (!str.includes("\\rtf")) return str;
  
  return str
    .replace(/\{\\fonttbl.*?\}/g, "")
    .replace(/\{\\colortbl.*?\}/g, "")
    .replace(/\\par(d)?/g, " ")
    .replace(/\\[a-z]+(-?\d+)? ?/ig, "")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

import * as XLSX from "xlsx";

/**
 * Convierte datos a Excel (.xlsx) y abre el diálogo de guardado nativo.
 */
export async function exportToExcel(filename: string, headers: string[], rows: (string | number | boolean | null | undefined)[][]): Promise<boolean> {
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
  
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTauri = typeof window !== "undefined" && !!(window as any).__TAURI_INTERNALS__;
  
  if (isTauri) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    
    const filePath = await save({ defaultPath: filename, filters: [{ name: "Excel", extensions: ["xlsx"] }] });
    if (filePath) {
      await writeFile(filePath, new Uint8Array(excelBuffer));
      return true;
    }
  } else {
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  }
  return false;
}
