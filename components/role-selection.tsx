'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { roleLabels, roleLoginMeta, visibleRoleCards } from "@/lib/roles"

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
						<Image src="/images/roxan-logo.svg" alt="Roxan" width={48} height={48} className="h-12 w-12" />
					</div>
					<h1 className="text-3xl font-bold text-foreground mb-2">
						Roxan Education Portal
					</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Welcome. Please select your role to continue.
					</p>
				</div>

				{/* Role Cards - All in 1 row */}
				<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
					{visibleRoleCards.map((roleId) => {
						const role = roleLoginMeta[roleId]
						const Icon = role.icon
						return (
							<Card
								key={roleId}
								className="cursor-pointer transition-all duration-200 hover:shadow-lg border-2 hover:border-primary/40 group"
								onClick={() => handleRoleSelect(roleId)}
							>
								<CardHeader className="text-center pb-2 pt-5">
									<div className="mx-auto mb-2 rounded-xl bg-primary/5 p-3 text-primary transition-colors group-hover:bg-primary/10">
										<Icon className="h-7 w-7" />
									</div>
									<CardTitle className="text-lg font-bold">{roleLabels[roleId]}</CardTitle>
								</CardHeader>
								<CardContent className="pb-5">
									<CardDescription className="text-center text-xs min-h-[32px] mb-3">
										{role.subtitle}
									</CardDescription>
									<Button
										className="w-full text-sm font-semibold"
										variant="outline"
									>
										Login
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
