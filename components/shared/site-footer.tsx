import Link from "next/link"
import Image from "next/image"

export function SiteFooter() {
  return (
    <footer className="bg-foreground/95 text-muted py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Image src="/images/roxan-logo.png" alt="Roxan" width={32} height={32} className="h-8 w-8" />
              <span className="text-lg font-bold text-background">Roxan</span>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">The complete education operations system for modern institutions.</p>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-background transition-colors">About</Link></li>
              <li><Link href="/testimonials" className="hover:text-background transition-colors">Testimonials</Link></li>
              <li><Link href="/contact" className="hover:text-background transition-colors">Contact</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-4">Portals</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/master/login" className="hover:text-background transition-colors">Master Console</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-background font-semibold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy" className="hover:text-background transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-background transition-colors">Terms of Service</Link></li>
              <li><Link href="/cookies" className="hover:text-background transition-colors">Cookie Policy</Link></li>
              <li><Link href="/data-protection" className="hover:text-background transition-colors">Data Protection</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-muted-foreground/20 mt-12 pt-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Roxan. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
