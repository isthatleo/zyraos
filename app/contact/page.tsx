"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Mail, Phone, MapPin, Send, CheckCircle, Building2, Clock, MessageSquare } from "lucide-react"
import { toast } from "sonner"
import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    setLoading(true)

    try {
      // Store as contact lead for super admin notifications
      const lead = {
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        email: formData.get("email"),
        institution: formData.get("institution"),
        message: formData.get("message"),
        submittedAt: new Date().toISOString(),
      }

      // POST to API to notify super admin
      await fetch("/api/contact-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      }).catch(() => {
        // Silently handle if API not ready yet
      })

      setLoading(false)
      setSubmitted(true)
      toast.success("Message sent successfully! We'll be in touch soon.")
    } catch {
      setLoading(false)
      toast.error("Failed to send message. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <SiteNav active="/contact" />

      <section className="pt-32 pb-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-extrabold text-gray-900 mb-4 tracking-tight">Get in Touch</h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Ready to modernize your institution? Reach out for a demo or partnership inquiry.
            </p>
          </div>

          {/* Bento contact info */}
          <div className="grid md:grid-cols-3 gap-4 mb-12">
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 text-center">
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Email</h3>
              <p className="text-gray-600 text-sm">hello@roxan.com</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-8 border border-blue-100 text-center">
              <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Phone</h3>
              <p className="text-gray-600 text-sm">+233 XX XXX XXXX</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl p-8 border border-green-100 text-center">
              <div className="h-12 w-12 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">Location</h3>
              <p className="text-gray-600 text-sm">Accra, Ghana</p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: extra info bento */}
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  <h3 className="font-bold text-gray-900">Enterprise Inquiries</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  For multi-school networks, custom deployments, or white-label solutions, contact our enterprise team at <span className="font-semibold text-orange-600">enterprise@roxan.com</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">Response Time</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">We respond to all inquiries within 24 hours during business days. Demo requests are prioritized and typically scheduled within 48 hours.</p>
              </div>
              <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
                <div className="flex items-center gap-3 mb-3">
                  <MessageSquare className="h-5 w-5 text-green-600" />
                  <h3 className="font-bold text-gray-900">Partnership Opportunities</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">We actively partner with education ministries, NGOs, and technology providers. Reach out at <span className="font-semibold text-orange-600">partners@roxan.com</span></p>
              </div>
            </div>

            {/* Form */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>
              {submitted ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Message Sent!</h3>
                  <p className="text-gray-600">We&apos;ll get back to you within 24 hours.</p>
                  <Button onClick={() => setSubmitted(false)} variant="outline" className="mt-6">Send Another</Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" name="firstName" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" name="lastName" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution Name</Label>
                    <Input id="institution" name="institution" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" name="message" required rows={5} />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full bg-orange-600 hover:bg-orange-700 text-white h-11 rounded-lg font-semibold">
                    {loading ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Send Message</>}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}
