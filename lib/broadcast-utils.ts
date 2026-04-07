// Broadcast utilities
export function calculateSmsCount(content: string): number {
  return Math.ceil(content.length / 160)
}

export function calculateEmailSize(content: string): string {
  const sizeInBytes = new TextEncoder().encode(content).length
  const sizeInKb = sizeInBytes / 1024
  return sizeInKb.toFixed(2)
}

export async function validatePhoneNumber(phone: string, countryCode: string): Promise<boolean> {
  // Simplified validation - in production use libphonenumber-js
  const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10,}$/
  return phoneRegex.test(phone)
}

export function getBroadcastStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    scheduled: "bg-blue-100 text-blue-800",
    sending: "bg-yellow-100 text-yellow-800",
    sent: "bg-green-100 text-green-800",
    failed: "bg-red-100 text-red-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

export function formatDeliveryRate(delivered: number, total: number): string {
  if (total === 0) return "0%"
  return ((delivered / total) * 100).toFixed(1)
}

// Message utilities
export function formatMessageTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

  return date.toLocaleDateString()
}

export function truncateMessage(message: string, maxLength: number = 100): string {
  return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message
}

// Finance utilities
export function formatCurrency(amount: number, currency: string = "GHC"): string {
  return `${currency} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function calculateOutstandingBalance(
  totalAmount: number,
  amountPaid: number
): number {
  return Math.max(0, totalAmount - amountPaid)
}

export function getFeeStatus(amountPaid: number, totalAmount: number): string {
  if (amountPaid === 0) return "unpaid"
  if (amountPaid >= totalAmount) return "paid"
  return "partial"
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    partial: "bg-blue-100 text-blue-800",
    unpaid: "bg-yellow-100 text-yellow-800",
    overdue: "bg-red-100 text-red-800",
    pending: "bg-gray-100 text-gray-800",
    failed: "bg-red-100 text-red-800",
    completed: "bg-green-100 text-green-800",
    refunded: "bg-purple-100 text-purple-800",
  }
  return colors[status] || "bg-gray-100 text-gray-800"
}

// Invoice utilities
export function generateInvoiceNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
  return `INV-${timestamp}-${random}`
}

export function generatePaymentReference(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 9).toUpperCase()
  return `PAY-${timestamp}-${random}`
}

// Audience targeting utilities
export function getAudienceLabel(audience: string): string {
  const labels: Record<string, string> = {
    all: "Entire School",
    students: "All Students",
    teachers: "Teachers Only",
    parents: "Parents Only",
    staff: "Staff Only",
    class: "Specific Class",
    department: "Department",
    custom: "Custom Group",
  }
  return labels[audience] || audience
}

// SMS provider utilities
export function getSmsProviderLabel(provider: string): string {
  const labels: Record<string, string> = {
    twilio: "Twilio",
    infobip: "Infobip",
    africas_talking: "Africa's Talking",
    nexmo: "Nexmo (Vonage)",
    termii: "Termii",
  }
  return labels[provider] || provider
}

// Channel utilities
export function getChannelIcon(channel: string): string {
  const icons: Record<string, string> = {
    sms: "📱",
    email: "📧",
    "in-app": "🔔",
  }
  return icons[channel] || "💬"
}

export function getChannelLabel(channel: string): string {
  const labels: Record<string, string> = {
    sms: "SMS",
    email: "Email",
    "in-app": "In-App",
  }
  return labels[channel] || channel.toUpperCase()
}

// Validation utilities
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, "").length >= 10
}

// Pagination utilities
export function getPaginationRange(
  currentPage: number,
  totalPages: number,
  pageRange: number = 5
): number[] {
  let startPage = Math.max(1, currentPage - Math.floor(pageRange / 2))
  let endPage = Math.min(totalPages, startPage + pageRange - 1)

  if (endPage - startPage + 1 < pageRange) {
    startPage = Math.max(1, endPage - pageRange + 1)
  }

  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
}

// Date utilities
export function getDateRange(type: "today" | "week" | "month" | "quarter" | "year") {
  const end = new Date()
  const start = new Date()

  switch (type) {
    case "today":
      start.setHours(0, 0, 0, 0)
      break
    case "week":
      start.setDate(start.getDate() - start.getDay())
      break
    case "month":
      start.setDate(1)
      break
    case "quarter":
      const quarter = Math.floor(start.getMonth() / 3)
      start.setMonth(quarter * 3, 1)
      break
    case "year":
      start.setMonth(0, 1)
      break
  }

  return { start, end }
}

// Export utilities
export function exportToCSV(data: any[], filename: string): void {
  const headers = Object.keys(data[0] || {})
  const csvContent = [
    headers.join(","),
    ...data.map((row) => headers.map((header) => JSON.stringify(row[header])).join(",")),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  const url = URL.createObjectURL(blob)

  link.setAttribute("href", url)
  link.setAttribute("download", `${filename}.csv`)
  link.style.visibility = "hidden"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

