
"use client"

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
  useSidebar // Import useSidebar
} from "@/components/ui/sidebar";
import { SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { Sparkles } from "lucide-react";

// Component to render the title, conditionally using SheetTitle
const AppTitle = () => {
  const sidebar = useSidebar(); // Get sidebar context

  const titleClassName = "text-xl font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden";

  if (sidebar.isMobile) { // If on mobile, use SheetTitle for accessibility within the sheet
    return (
      <SheetTitle className={titleClassName}>
        Feedback Flow
      </SheetTitle>
    );
  }
  // On desktop, use a regular div for the title
  return (
    <div className={titleClassName}>
      Feedback Flow
    </div>
  );
};


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider defaultOpen>
      <Sidebar collapsible="icon"> {/* Added collapsible="icon" */}
        <SidebarHeader className="pr-4 h-14 flex items-center border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <Sparkles className="h-7 w-7 text-sidebar-primary" />
            {/* Use the new AppTitle component */}
            <AppTitle />
          </Link>
        </SidebarHeader>
        <SidebarContent className="flex-1 p-0">
          <SidebarNav />
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
          <p className="text-xs text-sidebar-foreground/70">© 2024 Feedback Flow</p>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="flex flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

