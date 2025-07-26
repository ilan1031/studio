
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Users, MessageSquare, CheckCircle2, PlusCircle, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

// Mock Data
const recentForms = [
  { id: "1", name: "Customer Satisfaction Q3", responses: 152, status: "Active", responseRate: 76 },
  { id: "2", name: "Employee Engagement Survey", responses: 89, status: "Active", responseRate: 62 },
  { id: "3", name: "New Feature Feedback", responses: 230, status: "Closed", responseRate: 85 },
  { id: "4", name: "Website Usability Test", responses: 45, status: "Draft", responseRate: 0 },
];

const quickStats = [
  { title: "Total Forms", value: "12", icon: FileText, change: "+2 this week" },
  { title: "Total Responses", value: "1,287", icon: MessageSquare, change: "+150 this week" },
  { title: "Overall Sentiment", value: "Positive", icon: CheckCircle2, change: "75% Positive", sentimentIconColor: "text-[hsl(var(--chart-4))]" },
  { title: "Response Rate", value: "68%", icon: BarChart3, change: "-2% this week" },
];

const recentActivity = [
  { id: "1", user: "Alex Johnson", action: "created a new form:", itemName: "Product Feedback Q4", time: "2 hours ago", avatar: "https://placehold.co/40x40.png" },
  { id: "2", user: "Maria Garcia", action: "commented on response in:", itemName: "Customer Satisfaction Q3", time: "5 hours ago", avatar: "https://placehold.co/40x40.png" },
  { id: "3", user: "David Lee", action: "shared form:", itemName: "Employee Engagement Survey", time: "1 day ago", avatar: "https://placehold.co/40x40.png" },
];


export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's an overview of your feedback activity.</p>
        </div>
        <Button asChild>
          <Link href="/forms/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {quickStats.map((stat) => (
          <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.sentimentIconColor || 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent Forms</CardTitle>
            <CardDescription>Overview of your latest forms and their performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Form Name</TableHead>
                  <TableHead>Responses</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentForms.slice(0,3).map((form) => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name}</TableCell>
                    <TableCell>{form.responses}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        form.status === 'Active' ? 'bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--status-active-text))]' : 
                        form.status === 'Closed' ? 'bg-[hsl(var(--destructive))]/20 text-[hsl(var(--status-closed-text))]' :
                        'bg-[hsl(var(--chart-2))]/20 text-[hsl(var(--status-draft-text))]' // Using chart-2 (Teal/Accent) for Draft
                      }`}>
                        {form.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/forms/${form.id}/results`}>View Results</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
           <CardFooter>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/forms">View All Forms</Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
             <CardDescription>Latest actions from your team.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <Image src={activity.avatar} alt={activity.user} width={40} height={40} className="rounded-full" data-ai-hint="user avatar" />
                <div>
                  <p className="text-sm">
                    <span className="font-semibold">{activity.user}</span> {activity.action} <Link href="#" className="text-primary hover:underline">{activity.itemName}</Link>
                  </p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      
      <Card className="bg-primary/5 border-primary/20 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center gap-3">
          <Sparkles className="w-6 h-6 text-primary" />
          <CardTitle className="text-primary">AI-Powered Tip</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground">
            Consider using the <Link href="/forms/create/ai-tool" className="font-semibold text-primary hover:underline">AI Question Generator</Link> to discover new question ideas for your upcoming "Market Research Q4" survey.
          </p>
        </CardContent>
      </Card>

    </div>
  );
}
