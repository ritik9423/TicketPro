import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const cnCache = new Map();

export function cn(...inputs) {
  const merged = clsx(inputs);
  if (!merged) return "";
  
  const cached = cnCache.get(merged);
  if (cached !== undefined) return cached;

  const result = twMerge(merged);
  if (cnCache.size < 500) {
    cnCache.set(merged, result);
  }
  return result;
}
