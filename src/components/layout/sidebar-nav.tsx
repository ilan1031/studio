"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  Users,
  Mail,
  BarChart3,
  HelpCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  disabled?: boolean
}

const navItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Forms", href: "/forms", icon: FileText },
  { title: "Create Form", href: "/forms/create", icon: PlusCircle },
  { title: "Email Campaigns", href: "/emails", icon: Mail },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Team Members", href: "/settings/team", icon: Users },
  { title: "Settings", href: "/settings/account", icon: Settings },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col h-full">
      <SidebarMenu className="p-2 flex-grow">
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard")}
                className={cn(
                  "justify-start w-full",
                  item.disabled && "cursor-not-allowed opacity-50"
                )}
                tooltip={{ children: item.title, side: "right", align: "center" }}
              >
                <a>
                  <item.icon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
      <div className="p-2 mt-auto">
         <SidebarMenuItem>
            <Link href="/help" legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/help"}
                className="justify-start w-full"
                tooltip={{ children: "Help & Support", side: "right", align: "center" }}
              >
                <a>
                  <HelpCircle className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">Help & Support</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
      </div>
    </nav>
  )
}
