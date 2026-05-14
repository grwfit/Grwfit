// This file is superseded by app/(portal)/home/page.tsx
// Kept to avoid Next.js route conflict — redirects to portal
import { redirect } from "next/navigation";

export default function HomePageLegacy() {
  redirect("/login");
}
