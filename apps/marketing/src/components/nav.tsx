import Link from "next/link";
import { Dumbbell } from "lucide-react";

export function Nav() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Dumbbell className="h-6 w-6 text-indigo-600" />
          GrwFit
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/features" className="hover:text-gray-900 transition-colors">Features</Link>
          <Link href="/pricing" className="hover:text-gray-900 transition-colors">Pricing</Link>
          <Link href="/blog" className="hover:text-gray-900 transition-colors">Blog</Link>
          <Link href="/about" className="hover:text-gray-900 transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="https://app.grwfit.com/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 hidden sm:block">
            Sign in
          </Link>
          <Link
            href="https://app.grwfit.com/signup"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const LINKS: Record<string, Array<[string, string]>> = {
    Product:  [["Features", "/features"], ["Pricing", "/pricing"], ["Blog", "/blog"]],
    Company:  [["About", "/about"], ["Contact", "/contact"]],
    Legal:    [["Privacy Policy", "/privacy-policy"], ["Terms of Service", "/terms-of-service"]],
  };

  return (
    <footer className="border-t bg-gray-50 py-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 font-bold mb-3">
              <Dumbbell className="h-5 w-5 text-indigo-600" />
              GrwFit
            </div>
            <p className="text-sm text-gray-500">Gym management software built for India.</p>
          </div>
          {Object.entries(LINKS).map(([heading, links]) => (
            <div key={heading}>
              <p className="font-semibold text-sm mb-3">{heading}</p>
              <ul className="space-y-2">
                {links.map(([label, href]) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-400">
          <p>© {new Date().getFullYear()} GrwFit. All rights reserved.</p>
          <p>Made with ❤️ for Indian gyms</p>
        </div>
      </div>
    </footer>
  );
}
