import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const statusColors = {
  New: {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  Assigned: {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  Contacted: {
    bg: "bg-purple-100",
    text: "text-purple-800",
  },
};

export const tagColors = {
  "Hot Lead": {
    bg: "bg-red-100",
    text: "text-red-800",
  },
  "Demo Needed": {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
  "Tech Summit": {
    bg: "bg-green-100",
    text: "text-green-800",
  },
  "Follow-up": {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
  },
  "Enterprise": {
    bg: "bg-blue-100",
    text: "text-blue-800",
  },
};

export function getTagColor(tag: string) {
  const defaultColor = {
    bg: "bg-gray-100",
    text: "text-gray-800",
  };

  return tagColors[tag as keyof typeof tagColors] || defaultColor;
}

export function getStatusColor(status: string) {
  const defaultColor = {
    bg: "bg-gray-100",
    text: "text-gray-800",
  };

  return statusColors[status as keyof typeof statusColors] || defaultColor;
}

// Simple function to detect keywords in text and suggest tags
export function analyzeContextualTags(text: string): string[] {
  const tags: string[] = [];
  
  const keywordMap: Record<string, string> = {
    urgent: "Hot Lead",
    priority: "Hot Lead",
    hot: "Hot Lead",
    demo: "Demo Needed",
    presentation: "Demo Needed",
    summit: "Tech Summit",
    conference: "Tech Summit",
    expo: "Tech Summit",
    followup: "Follow-up",
    "follow up": "Follow-up",
    "follow-up": "Follow-up",
    enterprise: "Enterprise",
    corporate: "Enterprise"
  };
  
  const lowercaseText = text.toLowerCase();
  
  Object.entries(keywordMap).forEach(([keyword, tag]) => {
    if (lowercaseText.includes(keyword)) {
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }
  });
  
  return tags;
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Phone number validation and formatting
export function formatPhoneNumber(phone: string): string {
  // Strip all non-numeric characters
  const numbersOnly = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (numbersOnly.length === 10) {
    return `(${numbersOnly.slice(0, 3)}) ${numbersOnly.slice(3, 6)}-${numbersOnly.slice(6, 10)}`;
  }
  
  // Return original if not 10 digits
  return phone;
}

// Function to check if we're offline
export function isOffline(): boolean {
  return !navigator.onLine;
}

// Function to generate a unique ID for offline usage
export function generateOfflineId(): string {
  return 'offline-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
}
