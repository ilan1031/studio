
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { auth, db } from "@/lib/firebase"; 
import { updateProfile, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const accountFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  bio: z.string().max(160, "Bio must not be longer than 160 characters.").optional(),
  avatarUrl: z.string().url("Invalid URL for avatar.").optional().or(z.literal("")), 
});

type AccountFormValues = z.infer<typeof accountFormSchema>;

interface UserProfileData extends AccountFormValues {
  initials?: string;
}

export default function AccountSettingsPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<UserProfileData | null>(null);

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      avatarUrl: "",
    },
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setIsLoading(true);
        let bioFromDb = "";
        let avatarFromDb = user.photoURL || ""; // Prioritize Firebase Auth photoURL
        const userDocRef = doc(db, "users", user.uid);
        try {
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            bioFromDb = userDocSnap.data().bio || "";
            // If you store a separate avatar URL in Firestore and want to prioritize it:
            // avatarFromDb = userDocSnap.data().avatarUrl || user.photoURL || "";
          }
        } catch (error) {
          console.warn("Could not fetch user extended profile from Firestore.", error)
        }

        const initials = user.displayName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U";
        
        const userData: UserProfileData = {
          name: user.displayName || "",
          email: user.email || "",
          bio: bioFromDb,
          avatarUrl: avatarFromDb,
          initials: initials,
        };
        setCurrentUserData(userData);
        form.reset(userData);
        setIsLoading(false);
      } else {
        toast({ title: "Error", description: "Not authenticated. Please log in.", variant: "destructive" });
        router.push("/login"); 
        setIsLoading(false);
      }
    });
    return () => unsubscribe(); // Cleanup subscription
  }, [form, toast, router]);

  async function onSubmit(data: AccountFormValues) {
    setIsSaving(true);
    const user = auth.currentUser;
    if (!user) {
      toast({ title: "Error", description: "Not authenticated.", variant: "destructive" });
      setIsSaving(false);
      return;
    }

    try {
      const profileUpdates: { displayName?: string; photoURL?: string } = {};
      if (data.name !== user.displayName) {
        profileUpdates.displayName = data.name;
      }
      // If you were managing avatarUrl separately and wanted to update photoURL:
      // if (data.avatarUrl && data.avatarUrl !== user.photoURL) {
      //   profileUpdates.photoURL = data.avatarUrl;
      // }

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile(user, profileUpdates);
      }

      if (data.email !== user.email) {
        // TODO: Implement proper re-authentication flow for email change
        toast({
          title: "Email Update (Simulated)",
          description: `Changing email to ${data.email} requires re-authentication. Email not changed in this demo.`,
          variant: "default",
          duration: 7000,
        });
      }

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, { 
        bio: data.bio || "",
        name: data.name, // Store name in Firestore as well for consistency
        email: user.email, // Store email for querying/display if needed
        // avatarUrl: data.avatarUrl || user.photoURL // If you manage avatarUrl separately
      }, { merge: true });

      toast({
        title: "Profile Updated",
        description: "Your account details have been successfully updated.",
      });
      setCurrentUserData(prev => prev ? {
        ...prev, 
        name: data.name, 
        bio: data.bio,
        // avatarUrl: data.avatarUrl || user.photoURL || prev.avatarUrl // Update local state's avatarUrl
        initials: data.name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || prev.initials
      } : null);

    } catch (error: any) {
      console.error("Error updating profile:", error);
      let errorMessage = "Could not update profile.";
      if (error.code === "auth/requires-recent-login") {
        errorMessage = "This operation is sensitive and requires recent authentication. Please log out and log back in to update your email.";
      }
      toast({
        title: "Update Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading account settings...</p>
      </div>
    );
  }
  
  const displayedAvatarUrl = currentUserData?.avatarUrl || auth.currentUser?.photoURL || "";
  const displayedName = currentUserData?.name || auth.currentUser?.displayName || "";
  const displayedInitials = currentUserData?.initials || displayedName?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase() || "U";


  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </div>
      <Separator />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20" data-ai-hint="user avatar large">
                  <AvatarImage src={displayedAvatarUrl} alt={displayedName} />
                  <AvatarFallback>{displayedInitials}</AvatarFallback>
                </Avatar>
                <Button variant="outline" type="button" disabled>Change Avatar (TODO)</Button>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your full name" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="your.email@example.com" {...field} disabled={isSaving} />
                    </FormControl>
                     <FormMessage />
                    <p className="text-xs text-muted-foreground pt-1">Email change requires re-authentication (not implemented in this demo).</p>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Bio (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Tell us a little about yourself" {...field} disabled={isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and account security. (This section is a placeholder)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="current-password">Current Password</Label>
                <Input id="current-password" type="password" disabled />
              </div>
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input id="new-password" type="password" disabled />
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input id="confirm-password" type="password" disabled />
              </div>
              <Button variant="outline" type="button" disabled>Change Password (TODO)</Button>
            </CardContent>
          </Card>
          
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving || isLoading}>
              {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
