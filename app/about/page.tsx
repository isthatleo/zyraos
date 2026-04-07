import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Target, Users, Globe, Shield, Lightbulb, ArrowRight, Rocket, Heart } from "lucide-react"
import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

const values = [
  { icon: Target, title: "Mission-Driven", desc: "We exist to democratize access to world-class school management tools for every institution, regardless of size or budget.", color: "bg-orange-100 text-orange-600" },
  { icon: Users, title: "Community First", desc: "Built by educators, for educators. Our product decisions are informed by real classroom needs and administrative challenges.", color: "bg-blue-100 text-blue-600" },
  { icon: Globe, title: "Africa & Beyond", desc: "Starting with schools across Africa, we're building a platform that scales globally while respecting local education systems.", color: "bg-green-100 text-green-600" },
  { icon: Shield, title: "Security by Design", desc: "Every school's data is isolated in its own environment with enterprise-grade encryption and role-based access controls.", color: "bg-purple-100 text-purple-600" },
  { icon: Lightbulb, title: "AI-Powered Insights", desc: "From predicting at-risk students to optimizing timetables, our AI layer transforms raw data into actionable intelligence.", color: "bg-amber-100 text-amber-600" },
  { icon: Heart, title: "Built with Care", desc: "Every feature is crafted with attention to detail, accessibility, and the unique needs of educational institutions.", color: "bg-pink-100 text-pink-600" },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav active="/about" />

      <section className="pt-32 pb-20 bg-gradient-to-b from-orange-50 to-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 tracking-tight">
            Building the Future of <span className="text-orange-600">Education Management</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Roxan is a comprehensive, multi-tenant school management platform designed to serve primary schools, secondary schools, and universities with distinct, role-driven experiences.
          </p>
        </div>
      </section>

      {/* Story - Bento */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-10 border border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Story</h2>
              <div className="space-y-4 text-gray-600 leading-relaxed">
                <p>Education institutions across Africa and emerging markets still rely on fragmented tools — spreadsheets for attendance, paper receipts for fees, and disconnected systems for grades.</p>
                <p>Roxan was born from a simple observation: schools deserve the same quality of software that powers billion-dollar enterprises. Not watered-down versions — the real thing.</p>
                <p>We built an operating system, not just an app. Each school gets its own isolated environment with custom branding, while the platform handles the complexity of multi-tenancy, security, and scale.</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-orange-100 to-amber-100 rounded-3xl p-10 flex items-center justify-center border border-orange-200">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Rocket className="h-8 w-8 text-orange-600" />
                </div>
                <p className="text-6xl font-extrabold text-orange-600">OS</p>
                <p className="text-lg font-bold text-gray-800 mt-2">Education Operations System</p>
                <p className="text-sm text-gray-500 mt-1">Not just software — infrastructure</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values - Bento Grid */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">What We Stand For</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {values.map((v) => (
              <div key={v.title} className="bg-white rounded-3xl p-8 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-5 ${v.color}`}>
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Want to see it in action?</h2>
          <p className="text-gray-600 mb-8">Schedule a personalized demo and see how Roxan can transform your institution.</p>
          <Link href="/contact">
            <Button size="lg" className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-8 h-12 font-semibold">
              Contact Us <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
