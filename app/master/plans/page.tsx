"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button, buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
	Switch,
} from "@/components/ui/switch"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Check, X, Star, Zap, Shield, Users, Crown, Plus, Pencil, Trash2, Loader2, Globe } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { Separator } from "@/components/ui/separator"
import { useParams } from "next/navigation";
import Link from "next/link";

type Plan = {
	id: string
	name: string
	tagline?: string
	description: string | null
	price: string
	currency: "ZAR" | "USD" | "GBP"
	period: string
	label?: string // e.g. "Most Popular"
	features: string[] | null
	unavailableFeatures?: string[] | null
	modules?: string[] | null
	maxStudents: number | null
	maxStaff: number | null
	isActive: boolean
	tag: string | null
	popular: boolean
	color: string
	iconKey: "basic" | "starter" | "standard" | "professional" | "premium" | "enterprise" | "custom"
}

type Region = "za" | "uk" | "us";

const fallbackPlans: Plan[] = [
	{
		id: "basic",
		name: "Basic",
		tagline: "Essential for small setups",
		price: "299",
		currency: "ZAR",
		period: "month",
		description: "Perfect for small schools getting started",
		features: ["Up to 50 students", "Up to 10 staff", "Core modules only"],
		unavailableFeatures: ["Payment integration", "Customization", "Advanced analytics"],
		modules: ["Students", "Attendance", "Exams", "Communication"],
		maxStudents: 50,
		maxStaff: 10,
		popular: false,
		isActive: true,
		color: "blue",
		iconKey: "basic",
	},
	{
		id: "standard",
		name: "Standard",
		tagline: "The best for growing schools",
		label: "Most Popular",
		price: "599",
		currency: "ZAR",
		period: "month",
		description: "Ideal for growing educational institutions",
		features: ["Up to 200 students", "Up to 25 staff", "All core modules", "Parent portal"],
		unavailableFeatures: ["Customization", "API access"],
		modules: ["Students", "Attendance", "Exams", "Communication", "Finance"],
		maxStudents: 200,
		maxStaff: 25,
		popular: true,
		isActive: true,
		color: "purple",
		iconKey: "standard",
	},
]
const iconMap = {
	basic: Shield,
	starter: Zap,
	standard: Users,
	professional: Shield,
	premium: Star,
	enterprise: Crown,
	custom: Globe,
}
const getColorClasses = (color: string) => {
	const colors = {
		blue: {
			card: "border-blue-200 bg-blue-50 hover:bg-blue-100",
			iconBg: "bg-blue-100",
			iconText: "text-blue-600",
			button: "bg-blue-600 hover:bg-blue-700",
		},
		purple: {
			card: "border-purple-200 bg-purple-50 hover:bg-purple-100",
			iconBg: "bg-purple-100",
			iconText: "text-purple-600",
			button: "bg-purple-600 hover:bg-purple-700",
		},
		orange: {
			card: "border-orange-200 bg-orange-50 hover:bg-orange-100",
			iconBg: "bg-orange-100",
			iconText: "text-orange-600",
			button: "bg-orange-600 hover:bg-orange-700",
		},
		green: {
			card: "border-green-200 bg-green-50 hover:bg-green-100",
			iconBg: "bg-green-100",
			iconText: "text-green-600",
			button: "bg-green-600 hover:bg-green-700",
		},
		gray: {
			card: "border-gray-200 bg-gray-50 hover:bg-gray-100",
			iconBg: "bg-gray-100",
			iconText: "text-gray-600",
			button: "bg-gray-600 hover:bg-gray-700",
		},
		indigo: {
			card: "border-indigo-200 bg-indigo-50 hover:bg-indigo-100",
			iconBg: "bg-indigo-100",
			iconText: "text-indigo-600",
			button: "bg-indigo-600 hover:bg-indigo-700",
		},
	}
	return colors[color as keyof typeof colors] || colors.gray
}

function PlanDialog({
	open,
	onOpenChange,
	initialPlan,
	onSave,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	initialPlan: Plan | null
	onSave: (plan: Plan) => void
}) {
	const [saving, setSaving] = useState(false)

	const [plan, setPlan] = useState<Plan>(
		initialPlan || {
			id: "",
			name: "",
			tagline: "",
			description: "",
			price: "",
			features: [],
			unavailableFeatures: [],
			modules: [],
			maxStudents: null,
			maxStaff: null,
			label: "",
			isActive: true,
			tag: "",
			popular: false,
			color: "blue",
			currency: "R",
			period: "month",
			iconKey: "basic",
		}
	)

	useEffect(() => {
		setPlan(
			initialPlan || {
				id: "",
				name: "",
				tagline: "",
				description: "",
				price: "",
				features: [],
				unavailableFeatures: [],
				modules: [],
				maxStudents: null,
				maxStaff: null,
				label: "",
				isActive: true,
				tag: "",
				popular: false,
				currency: "R",
				period: "month",
				color: "blue",
				iconKey: "basic",
			}
		)
	}, [initialPlan, open])
	const handleInternalSave = async () => {
		setSaving(true)
		try {
			await onSave(plan)
		} finally {
			setSaving(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>{initialPlan ? "Edit Plan" : "New Plan"}</DialogTitle>
				</DialogHeader>

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label>Name</Label>
						<Input value={plan.name || ""} onChange={(e) => setPlan({ ...plan, name: e.target.value })} />
					</div>
					<div className="space-y-2">
						<Label>Tagline</Label>
						<Input value={plan.tagline || ""} onChange={(e) => setPlan({ ...plan, tagline: e.target.value })} />
					</div>
					<div className="space-y-2">
						<Label>Plan Label (e.g. Most Popular)</Label>
						<Input value={plan.label || ""} onChange={(e) => setPlan({ ...plan, label: e.target.value })} />
					</div>
					<div className="space-y-2">
						<Label>Price</Label>
						<Input value={plan.price || ""} onChange={(e) => setPlan({ ...plan, price: e.target.value })} />
					</div>
					<div className="space-y-2">
						<Label>Billing Cycle Note</Label>
						<Input placeholder="monthly, bi annually or yearly" value={plan.tag || ""} onChange={(e) => setPlan({ ...plan, tag: e.target.value })} />
					</div>
					<div className="space-y-2">
						<Label>Max Students</Label>
						<Input
							type="number"
							value={plan.maxStudents ?? ""}
							onChange={(e) => setPlan({ ...plan, maxStudents: e.target.value ? Number(e.target.value) : null })}
						/>
					</div>
					<div className="space-y-2">
						<Label>Max Staff</Label>
						<Input
							type="number"
							value={plan.maxStaff ?? ""}
							onChange={(e) => setPlan({ ...plan, maxStaff: e.target.value ? Number(e.target.value) : null })}
						/>
					</div>
					<div className="space-y-2 md:col-span-2">
						<Label>Description</Label>
						<Textarea value={plan.description || ""} onChange={(e) => setPlan({ ...plan, description: e.target.value })} />
					</div>
					<div className="space-y-2 md:col-span-2">
						<Label>Features (one per line)</Label>
						<Textarea
							value={(plan.features || []).join("\n")}
							onChange={(e) =>
								setPlan({
									...plan,
									features: e.target.value
										.split("\n")
										.map((item) => item.trim())
										.filter(Boolean),
								})
							}
							rows={6}
						/>
					</div>
					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="popular"
							checked={!!plan.popular}
							onChange={(e) => setPlan({ ...plan, popular: e.target.checked })}
							className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
						/>
						<Label htmlFor="popular">Most Popular Plan</Label>
					</div>
					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="isActive"
							checked={!!plan.isActive}
							onChange={(e) => setPlan({ ...plan, isActive: e.target.checked })}
							className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
						/>
						<Label htmlFor="isActive">Plan is Active</Label>
					</div>
					<div className="space-y-2">
						<Label>Accent Color</Label>
						<select 
							className="w-full p-2 border rounded-md text-sm"
							value={plan.color}
							onChange={(e) => setPlan({ ...plan, color: e.target.value })}
						>
							<option value="blue">Blue</option>
							<option value="purple">Purple</option>
							<option value="orange">Orange</option>
							<option value="green">Green</option>
							<option value="gray">Gray</option>
							<option value="indigo">Indigo</option>
						</select>
					</div>
					<div className="space-y-2">
						<Label>Icon Type</Label>
						<select 
							className="w-full p-2 border rounded-md text-sm"
							value={plan.iconKey}
							onChange={(e) => setPlan({ ...plan, iconKey: e.target.value as any })}
						>
							<option value="basic">Shield (Basic)</option>
							<option value="starter">Zap (Starter)</option>
							<option value="standard">Users (Standard)</option>
							<option value="professional">Shield (Professional)</option>
							<option value="premium">Star (Premium)</option>
							<option value="enterprise">Crown (Enterprise)</option>
						</select>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleInternalSave} disabled={saving}>
						{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
						Save Changes
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}

export default function SubscriptionPlansPage() {
	const [plans, setPlans] = useState<Plan[]>(fallbackPlans)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [activePlan, setActivePlan] = useState<Plan | null>(null)
	const [dialogOpen, setDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
	const [planToDelete, setPlanToDelete] = useState<Plan | null>(null)
	const [region, setRegion] = useState<Region>("za")
	const fetchPlans = async () => {
		setLoading(true)
		try {
			const response = await fetch("/api/master/plans", { cache: "no-store" })
			const data = await response.json()
			if (response.ok && Array.isArray(data.plans) && data.plans.length > 0) {
				setPlans(data.plans)
			} else {
				setPlans(fallbackPlans)
			}
		} catch {
			setPlans(fallbackPlans)
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchPlans()
	}, [])

	const handleSave = async (plan: Plan) => {
		setSaving(true)
		try {
			const method = plan.id ? "PUT" : "POST"
			const response = await fetch("/api/master/plans", {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(plan),
			})

			const data = await response.json()
			if (!response.ok) throw new Error(data.error || "Failed to save plan")
			
			toast.success(plan.id ? "Plan updated" : "New plan created")
			await fetchPlans()
			setDialogOpen(false)
			setActivePlan(null)
		} catch (error: any) {
			toast.error(error.message || "Error saving plan")
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async (planId: string) => {
		setSaving(true)
		try {
			const response = await fetch(`/api/master/plans/${planId}`, { method: "DELETE" })
			const data = await response.json()
			if (!response.ok) throw new Error(data.error || "Failed to delete")
			
			toast.success("Plan deleted")
			await fetchPlans()
			setDeleteDialogOpen(false)
			setPlanToDelete(null)
		} catch (error: any) {
			toast.error(error.message || "Error deleting plan")
		} finally {
			setSaving(false)
		}
	}

	const currencySymbol = region === "za" ? "R" : region === "uk" ? "£" : "$"

	return (
		<div className="p-6 lg:p-8 space-y-8 bg-gray-50 min-h-screen">
			{/* Page Header */}
			<div className="flex items-center justify-between gap-4 flex-wrap">
				<div className="space-y-2">
					<h1 className="text-3xl font-bold tracking-tight">Subscription Plans</h1>
				</div>
				<Button onClick={() => { setActivePlan(null); setDialogOpen(true); }} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Plan
				</Button>
			</div>

			<div className="flex justify-center mb-8">
				<div className="inline-flex items-center gap-1 p-1 rounded-lg bg-muted/50 border border-border/50">
					{(["za", "uk", "us"] as Region[]).map((r) => (
						<button 
							key={r} 
							onClick={() => setRegion(r)} 
							className={cn(
								"px-3 py-2 rounded-md text-xs font-medium transition-all",
								region === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
							)}
						>
							{r === "za" ? "ZAR" : r === "uk" ? "GBP" : "USD"}
						</button>
					))}
				</div>
			</div>

			{loading && plans.length === 0 ? (
				<div className="flex items-center gap-2 text-gray-600">
					<Loader2 className="h-4 w-4 animate-spin" />
					Loading plans...
				</div>
			) : (
				<>
					{/* Plans Grid */}
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto">
						{plans.map((plan) => {
							const IconComponent = iconMap[plan.iconKey] || Shield
							const colorClasses = getColorClasses(plan.color)
							return (
								<Card
									key={plan.id}
									className={cn(
										"relative flex flex-col rounded-2xl border-2 bg-white shadow-lg transition-all duration-300",
										colorClasses.card,
										plan.popular && "ring-4 ring-purple-500 ring-offset-4" // Enhanced ring for popular plan
									)}
								>
									{(plan.popular || plan.label) && (
										<div className="absolute -top-4 left-1/2 -translate-x-1/2">
											<Badge className="bg-primary text-primary-foreground px-4 py-1.5 text-xs font-semibold uppercase shadow-md">
												{plan.label || "Recommended"}
											</Badge>
										</div>
									)}

									<CardHeader className="pt-8 pb-4 space-y-4">
										<div
											className={cn(
												"w-14 h-14 mx-auto rounded-full flex items-center justify-center",
												colorClasses.iconBg
											)}
										>
											<IconComponent
												className={cn("h-7 w-7", colorClasses.iconText)}
											/>
										</div>
										<CardTitle className="text-3xl font-bold text-gray-900">
											{plan.name}
										</CardTitle>
										<p className="text-muted-foreground text-sm font-medium">
											{plan.tagline}
										</p>
										<div className="mt-4 text-center">
											<span className="text-5xl font-extrabold text-gray-900">
												{currencySymbol}
												{plan.price}
											</span>
											<span className="text-gray-600 text-lg">
												/{plan.period}
											</span>
										</div>
									</CardHeader>

									<CardContent className="flex-1 flex flex-col justify-between p-6 pt-0 space-y-4">
										<div className="text-sm text-gray-600 border-y py-2 text-center">
											Students: <span className="font-medium">{plan.maxStudents ?? "Unlimited"}</span>
											{" · "}
											Staff: <span className="font-medium">{plan.maxStaff ?? "Unlimited"}</span>
										</div>

										<div className="space-y-4 mb-6">
											<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Features</p>
											<ul className="space-y-2">
											{(plan.features || []).map((feature, index) => (
												<li key={index} className="flex items-start gap-3">
													<Check className="h-4 w-4 mt-0.5 text-primary" />
													<span className="text-gray-700 text-sm">
														{feature}
													</span>
												</li>
											))}
											{(plan.unavailableFeatures || []).map((feature, index) => (
												<li key={index} className="flex items-start gap-3 opacity-50">
													<X className="h-4 w-4 mt-0.5 text-muted-foreground" />
													<span className="text-muted-foreground text-sm line-through">
														{feature}
													</span>
												</li>
											))}
											</ul>
											
											{plan.modules && plan.modules.length > 0 && (
												<>
													<Separator />
													<div className="space-y-2">
														<p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Modules</p>
														<div className="flex flex-wrap gap-1">
															{plan.modules.map(m => (
																<Badge key={m} variant="secondary" className="text-[10px]">{m}</Badge>
															))}
														</div>
													</div>
												</>
											)}
										</div>

										<div className="flex gap-2 mt-auto">
											<Button 
												variant="outline" 
												size="sm" 
												onClick={() => { setActivePlan(plan); setDialogOpen(true); }} 
												className="flex-1 gap-1 h-10"
											>
												<Pencil className="h-4 w-4" />
												Edit
											</Button>
											<Button 
												variant="destructive" 
												size="sm" 
												onClick={() => { setPlanToDelete(plan); setDeleteDialogOpen(true); }} 
												className="gap-1 h-10 px-3"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</CardContent>
								</Card>
							)
						})}
					</div>
				</>
			)}

			<PlanDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				initialPlan={activePlan}
				onSave={handleSave}
			/>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Subscription Plan?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove the "{planToDelete?.name}" plan. Schools currently on this plan will not be affected until their next renewal.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={() => planToDelete && handleDelete(planToDelete.id)} className="bg-red-600">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* FAQ Section */}
			<Card className="rounded-2xl border-gray-200 bg-white shadow-xl">
				<CardHeader className="p-8">
					<CardTitle className="text-3xl font-bold text-gray-900 text-center">
						Frequently Asked Questions
					</CardTitle>
				</CardHeader>
				<CardContent className="p-8 pt-0">
					<div className="grid gap-8 md:grid-cols-2">
						<div>
							<h3 className="font-semibold text-xl text-gray-900 mb-2">
								Can I change plans anytime?
							</h3>
							<p className="text-gray-700 leading-relaxed">
								Yes, you can upgrade or downgrade your plan at any time. Changes
								take effect immediately, and your billing will be adjusted
								accordingly. There are no hidden fees for plan changes.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-xl text-gray-900 mb-2">
								Is there a setup fee?
							</h3>
							<p className="text-gray-700 leading-relaxed">
								No, we believe in transparent pricing. There are no setup fees
								for any of our plans. You only pay the monthly or annual
								subscription cost.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-xl text-gray-900 mb-2">
								What payment methods do you accept?
							</h3>
							<p className="text-gray-700 leading-relaxed">
								We accept all major credit cards (Visa, MasterCard, American
								Express), bank transfers, and popular mobile money platforms in
								supported regions.
							</p>
						</div>
						<div>
							<h3 className="font-semibold text-xl text-gray-900 mb-2">
								Do you offer discounts for annual billing?
							</h3>
							<p className="text-gray-700 leading-relaxed">
								Absolutely! You can save 15% when you choose annual billing for
								any of our plans. This is a great way to get more value for your
								money.
							</p>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
