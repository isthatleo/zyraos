import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Agreement to Terms</h2>
              <p>By accessing or using Roxan Education OS (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of an educational institution, you represent that you have the authority to bind that institution to these terms. If you do not agree to these terms, do not use the Platform.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Description of Service</h2>
              <p>Roxan Education OS is a multi-tenant, cloud-based education management platform that provides: student information management, academic tools (curriculum, timetable, gradebook, examinations), financial management (fees, invoicing, payment tracking), staff and HR management, communication tools, attendance tracking, admissions pipeline management, and analytics dashboards. Each subscribing institution receives an isolated environment accessible via a unique subdomain.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Account Registration & Responsibilities</h2>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.1 Institutional Accounts</h3>
              <p>Institutions are provisioned by the platform Super Admin. Each institution designates an administrator who manages users, roles, and data within their isolated environment.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.2 User Accounts</h3>
              <p>Individual user accounts are created by institutional administrators. Users are responsible for maintaining the confidentiality of their login credentials and for all activities under their accounts. Users must immediately report any unauthorized access.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">3.3 Accurate Information</h3>
              <p>You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate, current, and complete.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Subscription & Billing</h2>
              <p>Access to the Platform requires an active subscription. Subscription plans define feature limits including maximum students, staff, and available modules. Institutions are billed according to their selected plan. The first invoice is generated at provisioning time with the selected plan details. Non-payment may result in account suspension after a 14-day grace period. All fees are non-refundable except as required by applicable law.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Acceptable Use</h2>
              <p>You agree not to: use the Platform for any unlawful purpose; upload malicious code, viruses, or harmful content; attempt to access another institution&apos;s data or environment; interfere with the Platform&apos;s operation or security; use the Platform to store data unrelated to educational management; share login credentials or allow unauthorized access; scrape, crawl, or automatically extract data from the Platform.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Ownership</h2>
              <p>Institutions retain full ownership of all data they enter into the Platform. Roxan acts as a data processor on behalf of institutions. Upon subscription termination, institutions may request a full export of their data within the retention period (90 days). Roxan does not claim ownership of any institutional, student, or staff data.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Intellectual Property</h2>
              <p>The Platform, including its design, code, features, documentation, and branding, is the intellectual property of Roxan. Institutions are granted a non-exclusive, non-transferable license to use the Platform for the duration of their active subscription. Custom branding elements uploaded by institutions remain the property of the respective institution.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Service Availability & SLA</h2>
              <p>We target 99.9% uptime for the Platform. Scheduled maintenance windows will be communicated at least 48 hours in advance. We are not liable for interruptions caused by force majeure events, third-party service outages, or circumstances beyond our reasonable control. We provide 24/7 technical support for critical issues.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Roxan shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Platform. Our total liability shall not exceed the amount paid by the institution in the 12 months preceding the claim.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Termination</h2>
              <p>Either party may terminate the subscription with 30 days&apos; written notice. Roxan may immediately suspend or terminate access for violations of these Terms, non-payment, or illegal activity. Upon termination, the institution has 90 days to export their data before it is permanently deleted.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">11. Governing Law</h2>
              <p>These Terms are governed by the laws of the Republic of Ghana. Any disputes arising from these Terms shall be resolved through arbitration in Accra, Ghana, unless otherwise required by applicable local law.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">12. Contact</h2>
              <p>For questions about these Terms, contact us at <span className="font-semibold text-orange-600">legal@roxan.com</span> or write to: Roxan, Accra, Ghana.</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
