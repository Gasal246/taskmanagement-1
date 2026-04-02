import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function resolveSessionUserId(session: any): string {
  const rawId =
    session?.user?.id ??
    session?.user?.userid ??
    session?.user?._id ??
    session?.user?.user_id;

  if (!rawId) return "";
  if (typeof rawId === "string") return rawId;
  if (typeof rawId === "number") return String(rawId);
  if (typeof rawId === "object") {
    if ("$oid" in rawId && typeof rawId.$oid === "string") return rawId.$oid;
    if (
      typeof rawId.toString === "function" &&
      rawId.toString !== Object.prototype.toString
    ) {
      return rawId.toString();
    }
  }

  return "";
}

export function formatDate(dateTimeString: string) {
  if (!dateTimeString) return ""; // handle case where dateTimeString is undefined or null

  const date = new Date(dateTimeString);
  const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', };
  return date.toLocaleDateString('en-US', options);
}

export function formatDateShortly(dateTimeString: string) {
  if (!dateTimeString) return ""; // handle case where dateTimeString is undefined or null

  const date = new Date(dateTimeString);
  const options: any = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', };
  return date.toLocaleDateString('en-US', options);
}

export function formatDateTiny(dateTimeString: string | Date | null | undefined) {
  if (!dateTimeString) return ""; // handle case where dateTimeString is undefined or null

  const date = new Date(dateTimeString);
  const options: any = { day: 'numeric', month: 'long', year: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

export function formatDateTimeShort(dateTimeString: string) {
  if (!dateTimeString) return "";

  const date = new Date(dateTimeString);
  const options: any = { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' };
  return date.toLocaleString('en-US', options);
}

export function generateOTP(): string {
  const digits = '0123456789';
  let OTP = '';

  for (let i = 0; i < 6; i++) {
    OTP += digits[Math.floor(Math.random() * 10)];
  }

  return OTP;
}

export const multiFormatDateString = (timestamp: string = ""): string => {
  const timestampNum = Math.round(new Date(timestamp).getTime() / 1000);
  const date: Date = new Date(timestampNum * 1000);
  const now: Date = new Date();

  const diff: number = date.getTime() - now.getTime();
  const diffInSeconds: number = Math.abs(diff) / 1000;
  const diffInMinutes: number = diffInSeconds / 60;
  const diffInHours: number = diffInMinutes / 60;
  const diffInDays: number = diffInHours / 24;
  const diffInWeeks: number = diffInDays / 7;

  if (diff >= 0) {
    // Future date
    switch (true) {
      case Math.floor(diffInWeeks) >= 1:
        return `In ${Math.floor(diffInWeeks)} week${Math.floor(diffInWeeks) > 1 ? 's' : ''}`;
      case Math.floor(diffInDays) === 1:
        return `In ${Math.floor(diffInDays)} day`;
      case Math.floor(diffInDays) > 1 && diffInDays < 7:
        return `In ${Math.floor(diffInDays)} days`;
      case Math.floor(diffInHours) >= 1:
        return `In ${Math.floor(diffInHours)} hour${Math.floor(diffInHours) > 1 ? 's' : ''}`;
      case Math.floor(diffInMinutes) >= 1:
        return `In ${Math.floor(diffInMinutes)} minute${Math.floor(diffInMinutes) > 1 ? 's' : ''}`;
      default:
        return "In a few seconds";
    }
  } else {
    // Past date
    switch (true) {
      case Math.floor(diffInWeeks) >= 1:
        return `${Math.floor(diffInWeeks)} week${Math.floor(diffInWeeks) > 1 ? 's' : ''} ago`;
      case Math.floor(diffInDays) === 1:
        return `${Math.floor(diffInDays)} day ago`;
      case Math.floor(diffInDays) > 1 && diffInDays < 7:
        return `${Math.floor(diffInDays)} days ago`;
      case Math.floor(diffInHours) >= 1:
        return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) > 1 ? 's' : ''} ago`;
      case Math.floor(diffInMinutes) >= 1:
        return `${Math.floor(diffInMinutes)} minute${Math.floor(diffInMinutes) > 1 ? 's' : ''} ago`;
      default:
        return "Just now";
    }
  }
};

export function formatNumber(number: number) {
  let formattedNumber;

  if (number >= 1_00_00_000) {
    // Crores
    formattedNumber = number / 1_00_00_000;
    return addSuffix(formattedNumber, 'Cr');
  } else if (number >= 10_00_000) {
    // Millions
    formattedNumber = number / 10_00_000;
    return addSuffix(formattedNumber, 'M');
  } else if (number >= 1_00_000) {
    // Lakhs
    formattedNumber = number / 1_00_000;
    return addSuffix(formattedNumber, 'L');
  } else if (number >= 1_000) {
    // Thousands
    formattedNumber = number / 1_000;
    return addSuffix(formattedNumber, 'K');
  } else {
    // Less than a thousand
    return number.toString();
  }
}

function addSuffix(value: number, suffix: string) {
  // Check if the number has a decimal part other than .0
  if (value % 1 === 0) {
    return value.toString() + suffix;
  } else {
    return value.toFixed(1) + suffix;
  }
}

export function calculatePercentage(outof: number, total: number): number {
  if (outof === 0) return 0;
  let percentage = (total / outof) * 100;
  return percentage % 1 === 0 ? parseFloat(percentage.toFixed(0)) : parseFloat(percentage.toFixed(2));
}
