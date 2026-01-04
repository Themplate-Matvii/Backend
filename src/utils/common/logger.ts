import { formatDate } from "@utils/time/formatDate";

export const logger = {
  info: (...args: any[]) => console.log(`[INFO] ${formatDate()}`, ...args),
  warn: (...args: any[]) => console.warn(`[WARN] ${formatDate()}`, ...args),
  error: (...args: any[]) => console.error(`[ERROR] ${formatDate()}`, ...args),
};
