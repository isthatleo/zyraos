import { deliverPlatformWebhook, sendPlatformEmail, sendPlatformSms } from "@/lib/platform-integrations";
import { asBoolean, asString } from "@/lib/platform-settings-server";

type ProvisioningDeliveryInput = {
  school: {
    id: string;
    name: string;
    slug: string;
    country: string;
    currencyCode?: string | null;
  };
  adminUser: {
    name: string;
    email: string;
    phone?: string;
  };
  planName: string;
  temporaryPassword: string;
  portalUrl: string;
  tenantLoginUrl: string;
  invoice: {
    invoiceNumber: string;
    amount: unknown;
    currency: string;
    dueDate: Date;
  };
  database: {
    mode: string;
    provider: string;
    isolated: boolean;
    branchId?: string;
  };
  settings: Record<string, unknown>;
};

type DeliveryResult = {
  channel: "email" | "sms" | "webhook";
  ok: boolean;
  status: string;
  message: string;
  provider?: string;
};

function money(amount: unknown, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "ZAR" }).format(Number(amount || 0));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function onboardingEmail(input: ProvisioningDeliveryInput) {
  const supportEmail = asString(input.settings.supportEmail, "support@roxan.com");
  const amount = money(input.invoice.amount, input.invoice.currency);
  const dueDate = input.invoice.dueDate.toLocaleDateString();
  const subject = `Your Roxan school portal is ready: ${input.school.name}`;
  const text = [
    `Hello ${input.adminUser.name},`,
    "",
    `${input.school.name} has been provisioned on Roxan Education System.`,
    `Admin portal: ${input.portalUrl}`,
    `Role selection portal: ${input.tenantLoginUrl}`,
    `Login email: ${input.adminUser.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "",
    "You must change this temporary password after first login before entering the dashboard.",
    "",
    `Subscription plan: ${input.planName}`,
    `Invoice: ${input.invoice.invoiceNumber}`,
    `Amount: ${amount}`,
    `Due date: ${dueDate}`,
    "",
    `Support: ${supportEmail}`,
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px;color:#111827">
      <div style="max-width:680px;margin:auto;background:#ffffff;border-radius:24px;padding:32px;border:1px solid #e5e7eb">
        <p style="margin:0 0 8px;color:#f97316;font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase">Roxan Education System</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2">Your school portal is ready</h1>
        <p style="margin:0 0 24px;color:#4b5563">Hello ${escapeHtml(input.adminUser.name)}, ${escapeHtml(input.school.name)} has been provisioned.</p>
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:18px;padding:18px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-weight:700">First login details</p>
          <p style="margin:0;color:#4b5563">Email: <strong>${escapeHtml(input.adminUser.email)}</strong></p>
          <p style="margin:8px 0 0;color:#4b5563">Temporary password: <strong>${escapeHtml(input.temporaryPassword)}</strong></p>
          <p style="margin:10px 0 0;color:#9a3412;font-size:13px">You will be required to change this password before entering the dashboard.</p>
        </div>
        <p style="margin:0 0 16px">
          <a href="${escapeHtml(input.portalUrl)}" style="display:inline-block;background:#f97316;color:white;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700">Open admin portal</a>
        </p>
        <div style="border-top:1px solid #e5e7eb;padding-top:20px;margin-top:20px">
          <p style="margin:0 0 8px;font-weight:700">Onboarding invoice</p>
          <p style="margin:0;color:#4b5563">Invoice ${escapeHtml(input.invoice.invoiceNumber)} for <strong>${escapeHtml(amount)}</strong>, due ${escapeHtml(dueDate)}.</p>
          <p style="margin:8px 0 0;color:#4b5563">Plan: ${escapeHtml(input.planName)}</p>
        </div>
        <p style="margin:24px 0 0;color:#6b7280;font-size:13px">Need help? Contact ${escapeHtml(supportEmail)}.</p>
      </div>
    </div>
  `;
  return { subject, text, html };
}

function deliveryResult(channel: DeliveryResult["channel"], response: { ok: boolean; status: string; message: string; provider?: string }): DeliveryResult {
  return { channel, ok: response.ok, status: response.status, message: response.message, provider: response.provider };
}

export async function deliverProvisioningHandoff(input: ProvisioningDeliveryInput) {
  const results: DeliveryResult[] = [];
  const email = onboardingEmail(input);

  const ownerEmail = await sendPlatformEmail({
    to: input.adminUser.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  }).catch((error) => ({
    ok: false,
    provider: "email",
    status: "failed",
    message: error instanceof Error ? error.message : "Email delivery failed.",
  }));
  results.push(deliveryResult("email", ownerEmail));

  const sendCopyToSupport = asBoolean(input.settings.provisioningEmailSupportCopy, false);
  const supportEmail = asString(input.settings.supportEmail);
  if (sendCopyToSupport && supportEmail && supportEmail !== input.adminUser.email) {
    const supportCopy = await sendPlatformEmail({
      to: supportEmail,
      subject: `[Provisioned] ${input.school.name}`,
      html: email.html,
      text: email.text,
    }).catch((error) => ({
      ok: false,
      provider: "email",
      status: "failed",
      message: error instanceof Error ? error.message : "Support email copy failed.",
    }));
    results.push(deliveryResult("email", supportCopy));
  }

  if (asBoolean(input.settings.smsAlerts, false) && input.adminUser.phone) {
    const sms = await sendPlatformSms({
      to: input.adminUser.phone,
      body: `Roxan portal ready for ${input.school.name}. Login: ${input.portalUrl}. Email: ${input.adminUser.email}. Temporary password: ${input.temporaryPassword}`,
    }).catch((error) => ({
      ok: false,
      provider: "twilio",
      status: "failed",
      message: error instanceof Error ? error.message : "SMS delivery failed.",
    }));
    results.push(deliveryResult("sms", sms));
  }

  const webhook = await deliverPlatformWebhook({
    event: "school.provisioned",
    payload: {
      school: input.school,
      adminUser: { name: input.adminUser.name, email: input.adminUser.email },
      planName: input.planName,
      portalUrl: input.portalUrl,
      tenantLoginUrl: input.tenantLoginUrl,
      invoice: input.invoice,
      database: input.database,
    },
  }).catch((error) => ({
    ok: false,
    provider: "webhook",
    status: "failed",
    message: error instanceof Error ? error.message : "Webhook delivery failed.",
  }));
  results.push(deliveryResult("webhook", webhook));

  return {
    ok: results.some((result) => result.channel === "email" && result.ok),
    results,
  };
}
