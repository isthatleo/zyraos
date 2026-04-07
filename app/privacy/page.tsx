import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Introduction</h2>
              <p>Roxan Education OS (&quot;Roxan&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) is committed to protecting the privacy of all users, including students, parents, teachers, administrators, and institutional representatives who use our multi-tenant education management platform. This Privacy Policy describes how we collect, use, store, share, and protect personal information when you use our services.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Information We Collect</h2>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.1 Account Information</h3>
              <p>When an institution is provisioned on our platform, we collect: institution name, address, contact details, administrator name, email address, and phone number. Individual users provide their name, email, role, and authentication credentials.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.2 Student Records</h3>
              <p>Institutions may enter student information including names, dates of birth, guardian details, academic records, attendance data, medical information, and financial records (fees, payments, invoices). This data is entered and managed exclusively by authorized institution personnel.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.3 Usage Data</h3>
              <p>We automatically collect usage data including IP addresses, browser type, device information, pages visited, features used, session duration, and interaction patterns to improve our services and provide analytics.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.4 Communication Data</h3>
              <p>Messages, announcements, and broadcasts sent through our communication hub are stored to maintain communication history and enable audit trails.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>Providing and maintaining our education management platform services</li>
                <li>Authenticating users and enforcing role-based access controls (RBAC)</li>
                <li>Processing fee payments and generating financial reports for institutions</li>
                <li>Sending system notifications, alerts, and communications</li>
                <li>Generating analytics and insights for institutional decision-making</li>
                <li>Improving platform performance, security, and user experience</li>
                <li>Complying with legal obligations and regulatory requirements</li>
                <li>Providing technical support and responding to inquiries</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Isolation & Multi-Tenancy</h2>
              <p>Each institution on Roxan operates in a completely isolated environment. Institution data is stored in separate database branches with unique access credentials. No institution can access another institution&apos;s data. Platform administrators (Super Admins) have oversight capabilities limited to subscription management and platform health monitoring — they do not access individual student records.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Sharing & Third Parties</h2>
              <p>We do not sell personal information. We may share data with: payment processors (for fee transactions), communication service providers (for SMS/email delivery), cloud infrastructure providers (for hosting and storage), and legal authorities when required by law. All third-party processors are bound by data processing agreements.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Retention</h2>
              <p>Institutional data is retained for the duration of the subscription and for a reasonable period after termination (typically 90 days) to allow for data export. Students&apos; academic records may be retained longer at the institution&apos;s request to support alumni verification and transcript services. Audit logs are retained for a minimum of 2 years.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Security Measures</h2>
              <p>We implement industry-standard security measures including: TLS encryption for all data in transit, AES-256 encryption for data at rest, role-based access controls at every level, multi-factor authentication support, regular security audits and penetration testing, automated backup systems, and incident response procedures.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Your Rights</h2>
              <p>Depending on your jurisdiction, you may have the right to: access your personal data, correct inaccurate data, request deletion of your data, restrict processing, data portability, and withdraw consent. Institutions can exercise these rights on behalf of their users. Contact us at privacy@roxan.com to exercise these rights.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Children&apos;s Privacy</h2>
              <p>Our platform processes student data on behalf of educational institutions. We rely on the institution&apos;s lawful basis (typically legitimate interest or contractual necessity in the education context) for processing minors&apos; data. We do not directly collect data from children — all student data is entered by authorized institutional personnel.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contact</h2>
              <p>For privacy-related questions or concerns, contact our Data Protection Officer at <span className="font-semibold text-orange-600">privacy@roxan.com</span> or write to: Roxan, Accra, Ghana.</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
