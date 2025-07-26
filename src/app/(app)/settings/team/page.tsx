
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, PlusCircle, Trash2, UserPlus, Send, RefreshCw, XCircle, Loader2, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import type { AppUser, UserRole, Invite, InviteStatus } from "@/types";
import { auth } from "@/lib/firebase"; 
import { getFunctions, httpsCallable } from "firebase/functions";

// Mock team members, Owner will be dynamically added
const initialMockTeamMembersNoOwner: AppUser[] = [
  { id: "user1", name: "Alex Johnson", email: "alex.j@example.com", role: "Admin", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "AJ", joinedDate: "2023-01-15" },
  { id: "user2", name: "Maria Garcia", email: "maria.g@example.com", role: "Editor", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "MG", joinedDate: "2023-03-22" },
  { id: "user3", name: "David Lee", email: "david.l@example.com", role: "Viewer", teamId: "team1", avatarUrl: "https://placehold.co/40x40.png", initials: "DL", joinedDate: "2023-05-10" },
];

const initialMockPendingInvites: Invite[] = [
  { id: "invite1", inviteeEmail: "new.user@example.com", role: "Editor", status: "pending", inviterId: "user_owner_123", token: "mocktoken1", createdAt: new Date().toISOString() },
  { id: "invite2", inviteeEmail: "another.dev@example.com", role: "Viewer", status: "pending", inviterId: "user_owner_123", token: "mocktoken2", createdAt: new Date(Date.now() - 86400000 * 2).toISOString() },
];

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address."),
  role: z.enum(["Admin", "Editor", "Viewer"] as [Exclude<UserRole, "Owner">, ...Exclude<UserRole, "Owner">[]]).default("Viewer"),
});

type InviteMemberFormValues = z.infer<typeof inviteMemberSchema>;

async function callSendTeamInviteFunction(inviteData: { inviteeEmail: string, role: Exclude<UserRole, "Owner"> }): Promise<{success: boolean, message: string, invite?: Invite}> {
  const functions = getFunctions(auth.app); 
  const sendTeamInvite = httpsCallable(functions, 'sendTeamInvite');

  try {
    console.log("Calling 'sendTeamInvite' Firebase Function with data:", inviteData);
    // This is where you'd actually call the function if it were deployed and ready.
    // For now, we simulate success if the email is not "fail@example.com"
    if (inviteData.inviteeEmail === "fail@example.com") {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
        return { success: false, message: "Simulated backend function failure." };
    }

    // Simulate a successful function call and mock the returned invite object
    const mockReturnedInvite: Invite = {
      id: `invite_new_${Date.now()}`,
      inviteeEmail: inviteData.inviteeEmail,
      role: inviteData.role,
      status: "pending",
      inviterId: auth.currentUser?.uid || "unknown_inviter",
      token: `mocktoken_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
    console.log("Simulated Firebase Function 'sendTeamInvite' succeeded. Mock invite:", mockReturnedInvite);
    return { success: true, message: "Invitation sent successfully (simulated backend).", invite: mockReturnedInvite };

  } catch (error) {
    console.error("Error preparing to call 'sendTeamInvite' Firebase Function (or during simulation):", error);
    // This catch block would handle errors from httpsCallable itself if the function doesn't exist,
    // or network errors if the function call fails at that level.
    return { success: false, message: "An error occurred while trying to send the invitation (simulation error)." };
  }
}


export default function TeamSettingsPage() {
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = React.useState<AppUser[]>([]);
  const [pendingInvites, setPendingInvites] = React.useState<Invite[]>(initialMockPendingInvites);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = React.useState(false);
  const [isSubmittingInvite, setIsSubmittingInvite] = React.useState(false);
  const currentUser = auth.currentUser;

  const form = useForm<InviteMemberFormValues>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: "",
      role: "Viewer",
    },
  });
  
  React.useEffect(() => {
    if (currentUser) {
      const ownerDisplayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'User';
      const ownerData: AppUser = {
        id: currentUser.uid,
        name: `${ownerDisplayName} (Owner)`, // Suffix (Owner) for clear display in the name column
        email: currentUser.email || 'N/A',
        role: 'Owner' as UserRole,
        teamId: 'team1', // Assuming a default teamId
        avatarUrl: currentUser.photoURL || `https://placehold.co/40x40.png`,
        initials: (ownerDisplayName.split(' ').map(n => n[0]).join('').substring(0,2) || 'U').toUpperCase(),
        joinedDate: new Date().toISOString(), // Placeholder; ideally this is when the user created the account/team
      };
      setTeamMembers([ownerData, ...initialMockTeamMembersNoOwner]);
    } else {
      // Handle the case where currentUser is null (e.g., user logs out)
      // You might want to clear teamMembers or set them to a default non-dynamic state
      setTeamMembers([]); // Or initialMockTeamMembersNoOwner if you want to show something
    }
  }, [currentUser]);


  const isOwner = React.useMemo(() => {
    if (!currentUser || teamMembers.length === 0) return false;
    const ownerRecord = teamMembers.find(member => member.role === 'Owner');
    return ownerRecord?.id === currentUser.uid;
  }, [currentUser, teamMembers]);


  async function onInviteSubmit(data: InviteMemberFormValues) {
    setIsSubmittingInvite(true);
    
    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in.", variant: "destructive" });
      setIsSubmittingInvite(false);
      return;
    }

    if (!isOwner) {
        toast({ title: "Permission Denied", description: "Only the team owner can invite new members.", variant: "destructive"});
        setIsSubmittingInvite(false);
        return;
    }

    const currentNonOwnerMemberCount = teamMembers.filter(m => m.role !== "Owner").length;
    const currentPendingInviteCount = pendingInvites.filter(inv => inv.status === "pending").length;
    const totalNonOwnerInvitedOrMember = currentNonOwnerMemberCount + currentPendingInviteCount;

    if (totalNonOwnerInvitedOrMember >= 3) {
        toast({
            title: "Team Limit Reached (3 Members)",
            description: "You can invite up to 3 additional team members (excluding the Owner). Please manage existing members or invites.",
            variant: "destructive",
            duration: 7000,
        });
        setIsSubmittingInvite(false);
        return;
    }
        
    const emailExistsAsMember = teamMembers.some(member => member.email === data.email);
    const emailHasPendingInvite = pendingInvites.some(invite => invite.inviteeEmail === data.email && invite.status === "pending");

    if (emailExistsAsMember) {
      toast({ title: "User Exists", description: `${data.email} is already a team member.`, variant: "destructive" });
      setIsSubmittingInvite(false);
      return;
    }
    if (emailHasPendingInvite) {
      toast({ title: "Invite Pending", description: `${data.email} already has a pending invitation.`, variant: "default" });
      setIsSubmittingInvite(false);
      return;
    }

    try {
      const result = await callSendTeamInviteFunction({ inviteeEmail: data.email, role: data.role as Exclude<UserRole, "Owner"> });
      
      if (result.success && result.invite) {
        setPendingInvites(prev => [result.invite!, ...prev]); 
        toast({
          title: "Invitation Sent",
          description: result.message,
        });
        setIsInviteDialogOpen(false);
        form.reset();
      } else {
         toast({
          title: "Invite Error",
          description: result.message || "Could not send the invitation.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error during invite submission process:", error);
      toast({
        title: "Invite Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingInvite(false);
    }
  }
  
  const handleChangeRole = async (memberId: string, newRole: UserRole) => {
    if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the team owner can change roles.", variant: "destructive"});
      return;
    }
    const memberToUpdate = teamMembers.find(m => m.id === memberId);
    if (memberToUpdate?.role === "Owner" && newRole !== "Owner") { 
        toast({ title: "Action Denied", description: "Owner cannot change their own role from Owner.", variant: "destructive"});
        return;
    }
    if (memberId === currentUser?.uid && memberToUpdate?.role === "Owner" && newRole !== "Owner") {
        toast({ title: "Action Denied", description: "Owner cannot change their own role.", variant: "destructive"});
        return;
    }


    console.log(`Simulating role change for member ${memberId} to ${newRole}`);
    await new Promise(resolve => setTimeout(resolve, 500)); 

    setTeamMembers(prevMembers =>
      prevMembers.map(member =>
        member.id === memberId ? { ...member, role: newRole } : member
      )
    );
    toast({ title: "Role Updated (Simulated)", description: `Role for ${teamMembers.find(m=>m.id===memberId)?.name?.replace(" (Owner)","")} changed to ${newRole}.` });
  };

  const removeMember = async (memberId: string, memberName?: string) => {
    if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the team owner can remove members.", variant: "destructive"});
      return;
    }
    const memberToRemove = teamMembers.find(m => m.id === memberId);
    if (memberToRemove?.role === "Owner") { 
      toast({ title: "Action Denied", description: "Owner cannot be removed.", variant: "destructive"});
      return;
    }

    const cleanMemberName = memberName?.replace(" (Owner)","");
    if (!window.confirm(`Are you sure you want to remove ${cleanMemberName || 'this member'} from the team?`)) {
      return;
    }

    console.log("Simulating removal of member:", memberId);
    await new Promise(resolve => setTimeout(resolve, 500));
    setTeamMembers(prev => prev.filter(member => member.id !== memberId));
    toast({ title: "Member Removed (Simulated)", description: `${cleanMemberName || 'The team member'} has been removed.` });
  };

  const cancelInvite = async (inviteId: string) => {
     if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the team owner can cancel invites.", variant: "destructive"});
      return;
    }
    console.log("Simulating cancellation of invite:", inviteId);
    await new Promise(resolve => setTimeout(resolve, 500));
    setPendingInvites(prev => prev.filter(invite => invite.id !== inviteId));
    toast({ title: "Invitation Cancelled (Simulated)", description: "The pending invitation has been cancelled." });
  };

  const resendInvite = async (inviteId: string) => {
     if (!isOwner) {
      toast({ title: "Permission Denied", description: "Only the team owner can resend invites.", variant: "destructive"});
      return;
    }
    const invite = pendingInvites.find(inv => inv.id === inviteId);
    console.log("Simulating resend of invite:", inviteId);
    await new Promise(resolve => setTimeout(resolve, 500));
    toast({ title: "Invitation Resent (Simulated)", description: `Invitation to ${invite?.inviteeEmail} has been resent.` });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground">Manage who has access. Owners can invite up to 3 additional team members.</p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={!isOwner}> 
              <UserPlus className="mr-2 h-4 w-4" /> Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Invite New Team Member</DialogTitle>
              <DialogDescription>
                Enter the email address and select a team role. An invitation will be sent.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="name@example.com" {...field} disabled={isSubmittingInvite} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="role"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSubmittingInvite}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Admin">Admin (Full Access, except owner actions)</SelectItem>
                          <SelectItem value="Editor">Editor (Create & Manage Forms)</SelectItem>
                          <SelectItem value="Viewer">Viewer (View Results Only)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)} disabled={isSubmittingInvite}>Cancel</Button>
                  <Button type="submit" disabled={isSubmittingInvite || !currentUser}>
                    {isSubmittingInvite ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Invitation</>}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Team ({teamMembers.length})</CardTitle>
          <CardDescription>Users who have accepted their invitations and are part of your team.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMembers.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8" data-ai-hint="user avatar">
                        <AvatarImage src={member.avatarUrl} alt={member.name} />
                        <AvatarFallback>{member.initials || member.name?.substring(0,2).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                   <TableCell>
                    {member.role === "Owner" ? (
                         <span className={`px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary`}>
                            {member.role}
                        </span>
                    ) : (
                      <Select 
                        value={member.role} 
                        onValueChange={(newRole) => handleChangeRole(member.id, newRole as UserRole)}
                        disabled={!isOwner || member.id === currentUser?.uid} 
                      >
                        <SelectTrigger className="h-8 w-[100px] text-xs">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Editor">Editor</SelectItem>
                          <SelectItem value="Viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell>{member.joinedDate ? new Date(member.joinedDate).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell className="text-right">
                    {member.role !== "Owner" && isOwner ? (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeMember(member.id, member.name)} 
                        title="Remove member" 
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : member.role === "Owner" ? (
                        <span className="text-xs text-muted-foreground italic">Owner</span>
                    ): (
                         <span className="text-xs text-muted-foreground italic">Managed by owner</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {teamMembers.length === 0 && !currentUser && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    Loading team members...
                  </TableCell>
                </TableRow>
              )}
               {teamMembers.length === 0 && currentUser && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No team members yet. Invite someone to get started!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations ({pendingInvites.filter(inv => inv.status === 'pending').length})</CardTitle>
          <CardDescription>These users have been invited but haven't joined yet. (Mock Data)</CardDescription>
        </CardHeader>
        <CardContent>
           <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Invited Role</TableHead>
                <TableHead>Invited On</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingInvites.filter(invite => invite.status === 'pending').map((invite) => (
                <TableRow key={invite.id}>
                  <TableCell className="font-medium">{invite.inviteeEmail}</TableCell>
                  <TableCell>{invite.role}</TableCell>
                  <TableCell>{new Date(invite.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 text-xs rounded-full bg-[hsl(var(--chart-3))]/20 text-[hsl(var(--status-pending-text))]`}>
                        {invite.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                     <Button variant="ghost" size="sm" onClick={() => resendInvite(invite.id)} title="Resend invitation" disabled={!isOwner}>
                        <RefreshCw className="mr-1 h-3 w-3" /> Resend
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => cancelInvite(invite.id)} title="Cancel invitation" className="text-destructive hover:text-destructive" disabled={!isOwner}>
                        <XCircle className="mr-1 h-3 w-3" /> Cancel
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {pendingInvites.filter(invite => invite.status === 'pending').length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                    No pending invitations.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

