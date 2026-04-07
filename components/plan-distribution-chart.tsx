"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts"

const chartData = [
	{ name: "Basic", value: 1 },
	{ name: "Standard", value: 2 },
	{ name: "Premium", value: 1 },
]

const COLORS = ["#f97316", "#6b7280", "#22c55e"]

export function PlanDistributionChart() {
	return (
		<Card className="rounded-xl border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
			<CardHeader>
				<CardTitle className="text-lg font-semibold text-gray-900">
					Plan Distribution
				</CardTitle>
				<p className="text-sm text-gray-600">Active subscriptions by tier</p>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={250}>
					<PieChart>
						<Pie
							data={chartData}
							cx="50%"
							cy="50%"
							innerRadius={60}
							outerRadius={80}
							paddingAngle={2}
							dataKey="value"
						>
							{chartData.map((entry, index) => (
								<Cell
									key={`cell-${index}`}
									fill={COLORS[index % COLORS.length]}
								/>
							))}
						</Pie>
						<Tooltip />
						<Legend
							wrapperStyle={{ paddingTop: "20px" }}
							iconType="circle"
						/>
					</PieChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	)
}
