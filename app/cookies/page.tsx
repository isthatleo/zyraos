import { SiteNav } from "@/components/shared/site-nav"
import { SiteFooter } from "@/components/shared/site-footer"

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteNav />
      <section className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">Cookie Policy</h1>
          <p className="text-gray-500 mb-10">Last updated: {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <div className="bg-orange-50 rounded-3xl p-8 border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">1. What Are Cookies</h2>
              <p>Cookies are small text files stored on your device when you visit our platform. They help us recognize your device, maintain your session, remember your preferences, and improve your experience on Roxan Education OS.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">2. Types of Cookies We Use</h2>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.1 Essential Cookies (Required)</h3>
              <p>These cookies are necessary for the Platform to function. They include session tokens for authentication, CSRF protection tokens, tenant identification cookies for multi-tenant routing, and role-based access session data. These cannot be disabled as the Platform would not function without them.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.2 Preference Cookies</h3>
              <p>These cookies remember your settings such as theme preference (light/dark mode), language selection, sidebar state, and dashboard layout preferences. Disabling these means your preferences will not persist between sessions.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.3 Analytics Cookies</h3>
              <p>We use analytics cookies to understand how users interact with the Platform, which features are most used, and where users encounter difficulties. This data is aggregated and anonymized. It helps us prioritize development and improve user experience.</p>
              <h3 className="font-semibold text-gray-900 mt-4 mb-2">2.4 Performance Cookies</h3>
              <p>These cookies help us monitor Platform performance, identify slow-loading pages, and optimize resource delivery. They do not collect personally identifiable information.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">3. Cookie Duration</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm mt-3">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 font-semibold text-gray-900">Cookie Type</th>
                      <th className="text-left py-2 font-semibold text-gray-900">Duration</th>
                      <th className="text-left py-2 font-semibold text-gray-900">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-600">
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Session Token</td>
                      <td className="py-2">Until logout / 24 hours</td>
                      <td className="py-2">Authentication</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Theme Preference</td>
                      <td className="py-2">1 year</td>
                      <td className="py-2">UI Settings</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td className="py-2">Analytics</td>
                      <td className="py-2">90 days</td>
                      <td className="py-2">Usage Tracking</td>
                    </tr>
                    <tr>
                      <td className="py-2">CSRF Token</td>
                      <td className="py-2">Session</td>
                      <td className="py-2">Security</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">4. Third-Party Cookies</h2>
              <p>We may use third-party services that set their own cookies, including: payment processors for secure transaction handling, analytics providers for usage insights, and content delivery networks for performance optimization. We do not allow third-party advertising cookies on our Platform.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">5. Managing Cookies</h2>
              <p>You can control cookies through your browser settings. Most browsers allow you to block or delete cookies. However, blocking essential cookies will prevent you from using the Platform. You can also manage preference cookies through the Platform&apos;s settings panel within your dashboard.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">6. Updates to This Policy</h2>
              <p>We may update this Cookie Policy periodically. Significant changes will be communicated through the Platform. Continued use of the Platform after changes constitutes acceptance of the updated policy.</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100">
              <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact</h2>
              <p>For questions about our cookie practices, contact us at <span className="font-semibold text-orange-600">privacy@roxan.com</span>.</p>
            </div>
          </div>
        </div>
      </section>
      <SiteFooter />
    </div>
  )
}
