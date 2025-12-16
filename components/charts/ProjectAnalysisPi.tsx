"use client"
import * as React from "react"
import { TrendingUp } from "lucide-react"
import { Label, Pie, PieChart } from "recharts"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, } from "@/components/ui/chart"
import { useGetProjectStatistics } from "@/query/client/analyticsQueries"
export const description = "A donut chart with text"
const chartData = [
  { projectType: "ongoing", count: 275, fill: "var(--color-ongoing)" },
  { projectType: "owned", count: 190, fill: "var(--color-owned)" },
  { projectType: "completed", count: 200, fill: "var(--color-completed)" },
  { projectType: "new", count: 173, fill: "var(--color-new)" },
]
const chartConfig = {
  ongoing: {
    label: "Ongoing Projects: ",
    color: "hsl(var(--chart-5))",
  },
  completed: {
    label: "Completed Projects: ",
    color: "hsl(var(--chart-2))",
  },
  new: {
    label: "New Projects: ",
    color: "hsl(var(--chart-3))",
  },
  owned: {
    label: "Owned Projects: ",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const TaskAnalysis = ({ currentUser }: { currentUser: any }) => {
  const { data: chartData, isLoading: loadingProjectStatistics } = useGetProjectStatistics(currentUser?._id)
  return (
    <Card className="flex flex-col border-0 rounded-lg bg-slate-950/70">
      <CardHeader className="items-start pb-0">
        <CardTitle>Current Project Analysis</CardTitle>
        <CardDescription>all user engaged projects.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[400px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="projectType"
              innerRadius={60}
              strokeWidth={5}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {chartData[4]}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Projects
                        </tspan>
                      </text>
                    )
                  }
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 font-medium leading-none">
          Digital Report of all projects of this user <TrendingUp className="h-4 w-4" />
        </div>
        <div className="leading-none text-muted-foreground">
          Showing result from all the projects user included.
        </div>
      </CardFooter>
    </Card>
  )
}

export default TaskAnalysis