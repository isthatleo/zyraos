import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

export function SiteNav({ active, tenantSlug }: { active?: string, tenantSlug?: string | null }) {
  const links = [
    { href: "/about", label: "About" },
    { href: "/testimonials", label: "Testimonials" },
    { href: "/contact", label: "Contact" },
  ]

  const isTenant = tenantSlug && tenantSlug !== 'localhost' && tenantSlug !== 'www';

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-xl border-b border-border print:hidden">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/images/roxan-logo.png" alt="Roxan" width={32} height={32} className="h-8 w-8" />
          <span className="text-xl font-bold text-foreground">Roxan</span>
          <span className="text-[10px] font-semibold text-muted-foreground tracking-wider uppercase ml-0.5">EduOps</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition-colors ${active === l.href ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        {isTenant ? (
          <Link href="/login">
            <Button size="sm" className="rounded-full px-5">
              Login
            </Button>
          </Link>
        ) : (
          <Link href="/master/login">
            <Button size="sm" className="rounded-full px-5">
              Master Console
            </Button>
          </Link>
        )}
      </div>
    </nav>
  )
}
