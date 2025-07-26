
"use client"

import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { auth } from '../../lib/firebase';
import { useRouter } from 'next/navigation';
import { LogOut, User, Settings, CreditCard, Users, Mail } from "lucide-react"
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast"; 

export function UserNav() {
  const user = auth.currentUser; 
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      toast({
        title: "Logout Error",
        description: "Could not log you out. Please try again.",
        variant: "destructive",
      });
    }
  };

  let displayNameFallback = "U";
  const currentUserName = user?.displayName;
  const currentUserEmail = user?.email;
  const currentUserPhotoURL = user?.photoURL;

  if (currentUserName) {
    displayNameFallback = currentUserName.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
  } else if (currentUserEmail) {
    displayNameFallback = currentUserEmail.charAt(0).toUpperCase();
  }

  // Ensure we pass null if photoURL is not a valid string
  const avatarSrc = currentUserPhotoURL && currentUserPhotoURL.trim() !== "" ? currentUserPhotoURL : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative flex items-center space-x-2 rounded-full px-2 py-1 h-9">
          <Avatar className="h-7 w-7" data-ai-hint="user avatar small">
            <AvatarImage src={avatarSrc} alt={currentUserName || "User avatar"} />
            <AvatarFallback>{displayNameFallback}</AvatarFallback>
          </Avatar>
          {currentUserName && (
            <span className="text-sm font-medium text-foreground truncate max-w-[100px] hidden sm:inline">
              {currentUserName}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{currentUserName || "User"}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUserEmail || "No email"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/settings/account" passHref>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings/billing" passHref>
            <DropdownMenuItem disabled> {/* Assuming billing is not implemented yet */}
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
              <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings/appearance" passHref>
             <DropdownMenuItem disabled> {/* Assuming appearance is not implemented yet */}
              <Settings className="mr-2 h-4 w-4" />
              <span>Appearance</span>
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
           <Link href="/settings/team" passHref>
            <DropdownMenuItem>
              <Users className="mr-2 h-4 w-4" />
              <span>Team Members</span>
              <DropdownMenuShortcut>⌘T</DropdownMenuShortcut>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

