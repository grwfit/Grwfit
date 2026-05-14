import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchGymByDomain } from "@/lib/gym-data";
import { ModernTemplate } from "@/components/templates/modern";
import { BoldTemplate } from "@/components/templates/bold";
import { ClassicTemplate } from "@/components/templates/classic";

interface Props {
  searchParams: { domain?: string };
}

// Generate dynamic metadata per gym
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const domain = searchParams.domain ?? "localhost";
  const gymData = await fetchGymByDomain(domain);
  if (!gymData) return { title: "GrwFit — Gym Management" };

  const seo = gymData.gym.website?.seoMeta ?? {};
  const title = String(seo.title ?? gymData.gym.name);
  const description = String(seo.description ?? `Join ${gymData.gym.name} — your local fitness centre.`);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: seo.ogImage ? [String(seo.ogImage)] : [],
      type: "website",
    },
    // LocalBusiness structured data added inline in the template
  };
}

const TEMPLATES = {
  modern:  ModernTemplate,
  bold:    BoldTemplate,
  classic: ClassicTemplate,
} as const;

export default async function GymSitePage({ searchParams }: Props) {
  const domain = searchParams.domain ?? "localhost";
  const gymData = await fetchGymByDomain(domain);

  // In development, show a fallback demo site
  if (!gymData) {
    if (process.env["NODE_ENV"] === "development") {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 text-center">
          <div>
            <p className="text-4xl mb-4">🏋️</p>
            <h1 className="text-2xl font-bold mb-2">GrwFit Sites</h1>
            <p className="text-gray-600 mb-4">No gym found for domain: <code className="bg-gray-200 px-2 rounded">{domain}</code></p>
            <p className="text-sm text-gray-500">Gym websites render here based on the Host header.<br />Add a gym in the staff dashboard and connect a domain.</p>
          </div>
        </div>
      );
    }
    notFound();
  }

  if (gymData.gym.website && !gymData.gym.website.isPublished) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 text-center p-6">
        <div>
          <p className="text-4xl mb-4">🔧</p>
          <h1 className="text-xl font-bold mb-2">{gymData.gym.name}</h1>
          <p className="text-gray-600">Website coming soon. Check back later!</p>
        </div>
      </div>
    );
  }

  const templateId = gymData.gym.website?.templateId ?? "modern";
  const Template = TEMPLATES[templateId as keyof typeof TEMPLATES] ?? ModernTemplate;

  // LocalBusiness JSON-LD for SEO
  const address = gymData.gym.address as Record<string, string>;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: gymData.gym.name,
    telephone: gymData.gym.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: address["street"],
      addressLocality: address["city"],
      addressRegion: address["state"],
      postalCode: address["pincode"],
      addressCountry: "IN",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Template data={gymData} />
    </>
  );
}
