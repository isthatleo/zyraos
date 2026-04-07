import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Building2, Shield, BarChart3, Users, GraduationCap, Zap,
  ArrowRight, Globe, Clock, Smartphone, BookOpen, CreditCard
} from "lucide-react"
import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"
import { headers } from "next/headers"
import { getTenantFromRequest } from "@/lib/tenant-utils"
import { RoleSelection } from "@/components/role-selection"

const stats = [
  { value: "10K+", label: "Students Managed" },
  { value: "50+", label: "Schools Onboarded" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "24/7", label: "Support" },
]

export default async function LandingPage() {
  const headersList = await headers();
  const tenantSlug = getTenantFromRequest({ headers: headersList });

  if (tenantSlug && tenantSlug !== 'localhost' && tenantSlug !== 'www') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
        <div className="w-full max-w-sm md:max-w-4xl">
          <RoleSelection />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav tenantSlug={tenantSlug} />

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-chart-1/5" />
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] opacity-40" />
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-medium">
                <Zap className="h-4 w-4" />
                Next-Gen School Management
              </div>
              <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-foreground leading-[1.1] tracking-tight">
                The Operating System for
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-1"> Modern Education</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-lg leading-relaxed">
                A unified platform powering primary schools, secondary schools, and universities with isolated multi-tenant environments, intelligent analytics, and role-based access.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/contact">
                  <Button size="lg" className="rounded-full px-8 h-12 text-base font-semibold shadow-lg shadow-primary/20">
                    Get Started <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base font-semibold">
                    Learn More
                  </Button>
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4">
                {[
                  { icon: Globe, text: "Multi-Tenant" },
                  { icon: Clock, text: "Real-Time" },
                  { icon: Smartphone, text: "Mobile Ready" },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.text}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-chart-1/20 rounded-3xl blur-2xl opacity-30" />
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border">
                <Image
                  src="/images/hero-students.jpg"
                  alt="High school students walking through a modern campus"
                  width={1920}
                  height={1080}
                  priority
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 bg-foreground/95">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-4xl font-extrabold text-background">{stat.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-foreground mb-4">Everything Your Institution Needs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Built for primary schools, secondary schools, and universities — each with distinctive portals and workflows.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-gradient-to-br from-primary/5 to-chart-1/5 rounded-3xl p-10 border border-primary/10 flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Multi-Tenant Architecture</h3>
                <p className="text-muted-foreground max-w-lg">Each school gets an isolated environment with its own subdomain, database, and branding. Complete data isolation with enterprise-grade security.</p>
              </div>
              <div className="flex gap-3 mt-6">
                <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">Subdomain Routing</span>
                <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">DB Isolation</span>
                <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">Custom Branding</span>
              </div>
            </div>
            <div className="bg-card rounded-3xl p-8 border border-border flex flex-col justify-between min-h-[280px]">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-chart-1/10 flex items-center justify-center mb-5">
                  <Shield className="h-6 w-6 text-chart-1" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">RBAC System</h3>
                <p className="text-muted-foreground text-sm">Granular permissions for admins, teachers, students, parents, HR, and finance teams.</p>
              </div>
            </div>
            <div className="bg-card rounded-3xl p-8 border border-border flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-chart-2/10 flex items-center justify-center mb-5">
                  <BarChart3 className="h-6 w-6 text-chart-2" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Real-Time Analytics</h3>
                <p className="text-muted-foreground text-sm">AI-powered insights on student performance, attendance trends, and financial health.</p>
              </div>
            </div>
            <div className="md:col-span-2 bg-gradient-to-br from-chart-2/5 to-chart-3/5 rounded-3xl p-10 border border-chart-2/10 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="h-12 w-12 rounded-2xl bg-chart-2/10 flex items-center justify-center mb-5">
                  <Users className="h-6 w-6 text-chart-2" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-3">Complete Student Information System</h3>
                <p className="text-muted-foreground max-w-lg">Admissions pipeline, student profiles, promotions, alumni tracking, and document management — all in one unified system.</p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-chart-3/5 to-chart-4/5 rounded-3xl p-8 border border-chart-3/10 min-h-[200px]">
              <div className="h-12 w-12 rounded-2xl bg-chart-3/10 flex items-center justify-center mb-5">
                <GraduationCap className="h-6 w-6 text-chart-3" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Academic Engine</h3>
              <p className="text-muted-foreground text-sm">Curriculum, timetable builder, gradebook, and examination system.</p>
            </div>
            <div className="bg-gradient-to-br from-chart-4/5 to-chart-5/5 rounded-3xl p-8 border border-chart-4/10 min-h-[200px]">
              <div className="h-12 w-12 rounded-2xl bg-chart-4/10 flex items-center justify-center mb-5">
                <CreditCard className="h-6 w-6 text-chart-4" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Finance Suite</h3>
              <p className="text-muted-foreground text-sm">Fee management, invoicing, payment tracking, scholarships, and multi-currency.</p>
            </div>
            <div className="bg-gradient-to-br from-destructive/5 to-chart-5/5 rounded-3xl p-8 border border-destructive/10 min-h-[200px]">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
                <BookOpen className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">Communication Hub</h3>
              <p className="text-muted-foreground text-sm">SMS, email, broadcasts, and in-app messaging with automated alerts.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-br from-primary to-chart-1">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-extrabold text-primary-foreground mb-6">Ready to Transform Your Institution?</h2>
          <p className="text-lg text-primary-foreground/80 mb-10 max-w-2xl mx-auto">Join schools across Africa and beyond in modernizing education management with Roxan.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" variant="secondary" className="rounded-full px-8 h-12 font-semibold shadow-lg">
                Request a Demo <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline" className="text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 rounded-full px-8 h-12 font-semibold">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
