'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { GraduationCap, Users, UserCheck, Shield } from "lucide-react"
import { useRouter } from "next/navigation"
import Image from "next/image"

const roles = [
	{
		id: "student",
		title: "Student",
		description: "Access your academic journey, grades, and assignments",
		icon: GraduationCap,
		color: "text-primary",
		bg: "bg-primary/5 group-hover:bg-primary/10",
	},
	{
		id: "parent",
		title: "Parent",
		description: "Monitor your child's progress and school activities",
		icon: Users,
		color: "text-chart-1",
		bg: "bg-chart-1/5 group-hover:bg-chart-1/10",
	},
	{
		id: "staff",
		title: "Staff",
		description: "Manage classes, assignments, and student records",
		icon: UserCheck,
		color: "text-chart-3",
		bg: "bg-chart-3/5 group-hover:bg-chart-3/10",
	},
	{
		id: "hr",
		title: "HR Manager",
		description: "Manage staff records, payroll, and recruitment",
		icon: UserCheck,
		color: "text-purple-600",
		bg: "bg-purple-50 group-hover:bg-purple-100",
	},
	{
		id: "accountant",
		title: "Finance",
		description: "Manage school fees, expenses, and accounting",
		icon: Shield, // Using Shield as placeholder for Finance
		color: "text-green-600",
		bg: "bg-green-50 group-hover:bg-green-100",
	},
	{
		id: "admin",
		title: "Admin",
		description: "Full system control and school administration",
		icon: Shield,
		color: "text-chart-4",
		bg: "bg-chart-4/5 group-hover:bg-chart-4/10",
	},
]

export function RoleSelection() {
	const router = useRouter()

	const handleRoleSelect = (roleId: string) => {
		router.push(`/login?role=${roleId}`)
	}

	return (
		<div className="flex items-center justify-center p-4 relative">
			<div className="max-w-5xl w-full">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="flex justify-center mb-4">
						<Image src="/images/roxan-logo.png" alt="Roxan" width={48} height={48} className="h-12 w-12" />
					</div>
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Roxan Education Portal
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Welcome. Please select your role to continue.
					</p>
				</div>

				{/* Role Cards - All in 1 row */}
				<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
					{roles.map((role) => {
						const Icon = role.icon
						return (
							<Card
								key={role.id}
								className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/40 group"
								onClick={() => handleRoleSelect(role.id)}
							>
								<CardHeader className="text-center pb-2 pt-5">
									<div className={`mx-auto mb-2 p-3 rounded-xl ${role.bg} transition-colors ${role.color}`}>
										<Icon className="h-7 w-7" />
									</div>
									<CardTitle className="text-lg font-bold">{role.title}</CardTitle>
								</CardHeader>
								<CardContent className="pb-5">
									<CardDescription className="text-center text-xs min-h-[32px] mb-3">
										{role.description}
									</CardDescription>
									<Button
										className="w-full text-sm font-semibold"
										variant="outline"
									>
										Login as {role.title}
									</Button>
								</CardContent>
							</Card>
						)
					})}
				</div>

				{/* Footer */}
				<div className="text-center mt-8 text-muted-foreground text-xs">
					<p>© {new Date().getFullYear()} Roxan</p>
				</div>
			</div>
		</div>
	)
}
