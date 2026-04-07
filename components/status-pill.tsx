import { Badge } from "@/components/ui/badge"

interface StatusPillProps {
  status: "pending" | "paid" | "overdue" | "active" | "inactive" | "trial" | "void" | "deactivated"
  text: string
}

export function StatusPill({ status, text }: StatusPillProps) {
  const statusColors: Record<string, string> = {
    pending: "bg-orange-100 text-orange-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
    active: "bg-green-100 text-green-700",
    inactive: "bg-gray-100 text-gray-700",
    trial: "bg-blue-100 text-blue-700",
    void: "bg-gray-100 text-gray-700",
    deactivated: "bg-red-100 text-red-700",
  }

  return (
    <Badge className={`${statusColors[status]} rounded-full px-3 py-1 text-xs font-medium`}>
      {text}
    </Badge>
  )
}
