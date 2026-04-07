import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink } from "lucide-react"

const recentSchools = [
	{
		name: "Academy School International",
		date: "Feb 18, 2026",
		country: "Nigeria",
	},
	{
		name: "Mountain Peak Academy",
		date: "Feb 17, 2026",
		country: "Nigeria",
	},
	{
		name: "Stages International School",
		date: "Feb 16, 2026",
		country: "Ghana",
	},
	{
		name: "Thy Kingdom Come School",
		date: "Feb 16, 2026",
		country: "Ghana",
	},
]

export function RecentSchoolProvisioning() {
	return (
		<Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
			<CardHeader>
				<CardTitle className="text-lg font-semibold text-gray-900">
					Recent School Provisioning
				</CardTitle>
				<p className="text-sm text-gray-600">
					Schools recently added to the master control database.
				</p>
			</CardHeader>
			<CardContent className="space-y-0">
				{recentSchools.map((school, index) => (
					<div
						key={school.name}
						className={`flex items-center justify-between py-4 px-0 ${
							index !== recentSchools.length - 1
								? "border-b border-gray-100"
								: ""
						} hover:bg-gray-50 transition-colors`}
					>
						<div className="flex-1">
							<h4 className="font-medium text-gray-900">{school.name}</h4>
							<p className="text-sm text-gray-500">
								{school.date} • {school.country}
							</p>
						</div>
						<div className="flex items-center gap-2">
							<Button variant="outline" size="sm" className="h-8">
								Manage
							</Button>
							<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
								<ExternalLink className="h-4 w-4" />
								<span className="sr-only">Open</span>
							</Button>
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
