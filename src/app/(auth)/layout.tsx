import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/30">
      <div className="absolute top-8 left-8">
        <Link href="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
          <Sparkles className="h-7 w-7" />
          <span className="text-xl font-bold">Feedback Flow</span>
        </Link>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
      <footer className="absolute bottom-8 text-center text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} Feedback Flow. All rights reserved.
      </footer>
    </div>
  );
}
