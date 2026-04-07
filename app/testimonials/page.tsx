import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Star, Quote, ArrowRight, MessageSquarePlus } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

// These will be loaded from the database once school admins submit testimonials after 3 months of usage.
// For now the page shows a CTA encouraging submissions. No placeholder data.

export default function TestimonialsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav active="/testimonials" />

      <section className="pt-32 pb-16 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">
            What Schools Are <span className="text-orange-600">Saying</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real feedback from school administrators who have been using Roxan.
          </p>
        </div>
      </section>

      {/* Empty state / CTA for new testimonials */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl border border-orange-100 p-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-6">
              <MessageSquarePlus className="h-8 w-8 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Testimonials Coming Soon</h2>
            <p className="text-gray-600 max-w-lg mx-auto mb-6 leading-relaxed">
              School administrators who have been active on the platform for at least 3 months can submit a testimonial. These verified reviews will appear here with the writer&apos;s name and school.
            </p>
            <div className="bg-white rounded-2xl border border-orange-200 p-6 max-w-md mx-auto">
              <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
              <ul className="text-sm text-gray-600 space-y-2 text-left">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">1.</span>
                  Use Roxan for at least 3 months
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">2.</span>
                  Submit your testimonial from your Admin dashboard
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 font-bold mt-0.5">3.</span>
                  Once approved, it appears here with your name and school
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-orange-600 to-amber-600">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Join?</h2>
          <p className="text-orange-100 mb-8">See why institutions are switching to Roxan.</p>
          <Link href="/contact">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 rounded-full px-8 h-12 font-semibold">
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
