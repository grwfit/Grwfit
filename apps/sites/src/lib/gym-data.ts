const API_URL = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3000/api/v1";

export interface GymPlan {
  id: string;
  name: string;
  pricePaise: number;
  durationDays: number;
}

export interface GymTrainer {
  id: string;
  name: string;
}

export interface WebsiteContent {
  hero?: {
    headline?: string;
    subheadline?: string;
    ctaText?: string;
    backgroundImage?: string | null;
  };
  about?: {
    title?: string;
    body?: string;
    features?: string[];
  };
  contact?: {
    showMap?: boolean;
    hours?: string;
  };
}

export interface GymSiteData {
  gym: {
    id: string;
    name: string;
    slug: string;
    phone: string;
    address: Record<string, string>;
    logoUrl: string | null;
    website: {
      templateId: string;
      content: WebsiteContent;
      seoMeta: { title?: string; description?: string; ogImage?: string | null };
      isPublished: boolean;
    } | null;
  };
  plans: GymPlan[];
  trainers: GymTrainer[];
}

export async function fetchGymByDomain(domain: string): Promise<GymSiteData | null> {
  try {
    const res = await fetch(`${API_URL}/sites/by-domain?domain=${encodeURIComponent(domain)}`, {
      next: { revalidate: 60 }, // ISR — revalidate every 60s
    });
    if (!res.ok) return null;
    const data = await res.json() as { data: GymSiteData | null };
    return data.data;
  } catch {
    return null;
  }
}

export async function submitTrialBooking(data: {
  name: string;
  phone: string;
  email?: string;
  gymSlug: string;
}) {
  const res = await fetch(`${API_URL}/sites/trial-booking`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.ok;
}
