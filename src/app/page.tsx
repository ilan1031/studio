
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, LogIn, UserPlus, Edit3, BarChart3, Send } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/30">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold text-foreground">Feedback Flow</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/login">
                <LogIn className="mr-2 h-4 w-4" /> Login
              </Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                <UserPlus className="mr-2 h-4 w-4" /> Sign Up
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container py-16 md:py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground">
            Streamline Your <span className="text-primary">Feedback</span> Collection
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
            Effortlessly create forms, gather responses, and gain valuable insights with AI-powered analysis.
            Feedback Flow helps you understand your audience better.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transition-shadow">
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="shadow-lg hover:shadow-accent/30 transition-shadow">
              <Link href="/dashboard">View Demo Dashboard</Link>
            </Button>
          </div>
        </section>

        <section className="py-16 md:py-24 bg-background/50">
            <div className="container">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Powerful Features, Simple Interface</h2>
                    <p className="mt-4 text-lg text-muted-foreground">Everything you need to manage feedback effectively.</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <FeatureCard
                        icon={<Edit3 className="w-8 h-8 text-primary" />}
                        title="AI Form Creation"
                        description="Design effective forms quickly with AI suggestions based on your topic."
                    />
                    <FeatureCard
                        icon={<Send className="w-8 h-8 text-primary" />}
                        title="Custom Email Campaigns"
                        description="Reach your audience with personalized email invitations to complete forms."
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-8 h-8 text-primary" />}
                        title="Insightful Dashboards"
                        description="Visualize feedback and sentiment metrics to make data-driven decisions."
                    />
                </div>
            </div>
        </section>
        
        <section className="container py-16 md:py-24">
          <Card className="shadow-xl overflow-hidden">
            <div className="grid md:grid-cols-2 items-center">
              <div className="p-8 md:p-12">
                <h2 className="text-3xl font-bold text-foreground">Ready to Elevate Your Feedback Process?</h2>
                <p className="mt-4 text-muted-foreground">
                  Join thousands of users who trust Feedback Flow to gather and analyze critical feedback.
                  Sign up today and experience the difference.
                </p>
                <Button size="lg" asChild className="mt-8 shadow-lg hover:shadow-primary/30 transition-shadow">
                  <Link href="/signup">Create Your First Form</Link>
                </Button>
              </div>
              <div 
                className="hidden md:flex items-center justify-center relative min-h-[300px] md:h-full bg-secondary/20 p-8"
              >
                <Image
                  src="https://placehold.co/500x350.png"
                  alt="Sample Form Template"
                  width={500}
                  height={350}
                  className="rounded-lg shadow-xl object-cover transform transition-transform duration-300 ease-in-out hover:scale-105"
                  data-ai-hint="form template"
                />
              </div>
            </div>
          </Card>
        </section>
      </main>

      <footer className="py-8 border-t border-border/40 bg-background/95">
        <div className="container text-center text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} Feedback Flow. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
    return (
        <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
                <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    {icon}
                </div>
                <CardTitle className="text-xl font-semibold">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <CardDescription>{description}</CardDescription>
            </CardContent>
        </Card>
    );
}
