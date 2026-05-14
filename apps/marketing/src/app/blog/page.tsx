import type { Metadata } from "next";
import Link from "next/link";
import { Nav, Footer } from "@/components/nav";

export const metadata: Metadata = {
  title: "Blog — Gym Management Tips",
  description: "Expert advice on gym management, member retention, and growing your fitness business in India.",
};

const POSTS = [
  {
    slug: "reduce-gym-member-churn",
    title: "5 Proven Ways to Reduce Gym Member Churn in India",
    desc: "Member churn is the #1 revenue killer for Indian gyms. Here's how top gyms keep 80%+ retention.",
    category: "Member Retention",
    date: "2025-05-01",
    readTime: "5 min",
  },
  {
    slug: "gst-invoicing-gym-india",
    title: "GST Invoicing for Gyms: A Complete Guide (2024-25)",
    desc: "Everything you need to know about GST for gym services in India — HSN codes, CGST/SGST, and more.",
    category: "Finance",
    date: "2025-04-18",
    readTime: "8 min",
  },
  {
    slug: "whatsapp-gym-member-communication",
    title: "How to Use WhatsApp to Recover ₹3L+ in Lapsed Memberships",
    desc: "The exact WhatsApp message templates that 500+ Indian gyms use to win back expired members.",
    category: "Marketing",
    date: "2025-04-05",
    readTime: "6 min",
  },
  {
    slug: "gym-crm-software-india",
    title: "Best Gym CRM Software for India in 2025",
    desc: "An honest comparison of gym management software options available for Indian fitness studios.",
    category: "Gym Management",
    date: "2025-03-22",
    readTime: "10 min",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <div className="pt-28 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-3">Gym Management Blog</h1>
          <p className="text-gray-500 mb-12">Tips, guides, and insights for Indian gym owners.</p>

          <div className="grid gap-6">
            {POSTS.map((post) => (
              <article key={post.slug} className="border rounded-2xl p-6 hover:border-indigo-300 transition-colors group">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">{post.category}</span>
                  <span className="text-xs text-gray-400">{new Date(post.date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                  <span className="text-xs text-gray-400">· {post.readTime} read</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                  <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                </h2>
                <p className="text-gray-600 text-sm">{post.desc}</p>
                <Link href={`/blog/${post.slug}`} className="inline-flex items-center gap-1 text-indigo-600 text-sm font-medium mt-3 hover:underline">
                  Read more →
                </Link>
              </article>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
