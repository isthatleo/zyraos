import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

export default function DataProtectionPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Data Protection Policy</h1>
          <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. Our Commitment</h2>
              <p>Roxan Education OS is committed to the highest standards of data protection. As a multi-tenant education platform handling sensitive student, staff, and institutional data, we recognize the critical importance of data security and compliance with international data protection regulations including GDPR (for EU-based users), Ghana&apos;s Data Protection Act (Act 843), and COPPA (for US-based institutions serving children under 13).</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Data Controller & Processor</h2>
              <p>Each subscribing institution is the <strong>Data Controller</strong> for the personal data of its students, staff, and parents. Roxan acts as the <strong>Data Processor</strong>, processing data on behalf of institutions according to their instructions and these policies. A formal Data Processing Agreement (DPA) is executed with each institution at provisioning time.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Lawful Basis for Processing</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Contractual Necessity:</strong> Processing student and staff data is necessary for the performance of the education management contract between Roxan and the institution.</li>
                <li><strong>Legitimate Interest:</strong> Platform analytics, security monitoring, and service improvement are based on the legitimate interest of maintaining a secure, performant service.</li>
                <li><strong>Consent:</strong> Where required (e.g., marketing communications, testimonials), explicit consent is obtained and can be withdrawn at any time.</li>
                <li><strong>Legal Obligation:</strong> We may process data to comply with legal requirements, court orders, or regulatory mandates.</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Technical Safeguards</h2>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">4.1 Multi-Tenant Isolation</h3>
              <p>Each institution operates in a fully isolated database environment (Neon PostgreSQL branch). There is no shared data layer between tenants. Access controls are enforced at the infrastructure level, not just the application level.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">4.2 Encryption</h3>
              <p>All data in transit is encrypted using TLS 1.3. Data at rest is encrypted using AES-256. Authentication tokens are cryptographically signed and have configurable expiration periods.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">4.3 Access Controls</h3>
              <p>Role-Based Access Control (RBAC) ensures users only access data relevant to their role. The permission matrix is configurable per institution. Audit logs track all data access and modifications.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">4.4 Infrastructure Security</h3>
              <p>Our infrastructure is hosted on enterprise-grade cloud providers with SOC 2 Type II compliance. We conduct regular penetration testing, vulnerability scanning, and security audits. Automated backup systems ensure data recovery capability.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Data Subject Rights</h2>
              <p>Data subjects (students, parents, staff) can exercise their rights through their institution&apos;s administrator. Rights include:</p>
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li><strong>Right of Access:</strong> Request a copy of personal data held about them</li>
                <li><strong>Right to Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of personal data (subject to legal retention requirements)</li>
                <li><strong>Right to Restrict Processing:</strong> Request that processing be limited</li>
                <li><strong>Right to Data Portability:</strong> Receive data in a structured, machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interest</li>
              </ul>
              <p className="mt-3">Requests are processed within 30 days. Institutions can perform bulk data exports from their admin dashboard at any time.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Data Breach Response</h2>
              <p>In the event of a data breach, we follow a strict incident response procedure:</p>
              <ul className="list-disc pl-5 space-y-2 mt-3">
                <li>Immediate containment and assessment within 1 hour of detection</li>
                <li>Notification to affected institutions within 24 hours</li>
                <li>Notification to relevant supervisory authorities within 72 hours (as required by GDPR)</li>
                <li>Notification to affected data subjects without undue delay where required</li>
                <li>Full post-incident review and remediation report within 14 days</li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. International Data Transfers</h2>
              <p>Where data is transferred across international borders, we ensure appropriate safeguards are in place through Standard Contractual Clauses (SCCs) or adequacy decisions. Our primary infrastructure is located in regions that provide adequate protection for personal data.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">8. Data Protection Officer</h2>
              <p>Our Data Protection Officer oversees compliance with this policy and applicable data protection laws. Contact: <span className="font-semibold text-orange-600">dpo@roxan.com</span></p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">9. Regular Reviews</h2>
              <p>This Data Protection Policy is reviewed quarterly and updated as needed to reflect changes in our practices, regulatory requirements, or industry standards. All institution administrators are notified of material changes.</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
