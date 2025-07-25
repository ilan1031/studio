
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MoreHorizontal, PlusCircle, Send, Edit3, Trash2, Eye, Palette } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface EmailCampaign {
  id: string;
  name: string;
  formTitle: string;
  formId: string;
  status: "Draft" | "Sent" | "Scheduled";
  sentCount: number;
  openRate: number; // Percentage
  clickRate: number; // Percentage
  createdAt: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // Added body for template editing
  lastUpdated: string;
}

// Mock Data
const mockCampaigns: EmailCampaign[] = [
  { id: "camp1", name: "Q3 Feedback Drive", formTitle: "Customer Satisfaction Q3", formId: "form_1", status: "Sent", sentCount: 500, openRate: 65, clickRate: 22, createdAt: "2023-09-01" },
  { id: "camp2", name: "Employee Survey Invite", formTitle: "Employee Engagement Survey", formId: "form_2", status: "Scheduled", sentCount: 0, openRate: 0, clickRate: 0, createdAt: "2023-10-15" },
  { id: "camp3", name: "New Feature Launch", formTitle: "New Feature Feedback", formId: "form_3", status: "Draft", sentCount: 0, openRate: 0, clickRate: 0, createdAt: "2023-11-01" },
];

const mockTemplates: EmailTemplate[] = [
  { id: "tpl1", name: "Standard Feedback Request", subject: "We'd Love Your Feedback on {{FormName}}!", body: "Dear [User Name],\n\nPlease take a moment to fill out our feedback form: {{FormName}}.\n\n[Form Link Button]\n\nThanks,\nFeedback Flow Team", lastUpdated: "2023-08-20" },
  { id: "tpl2", name: "Friendly Reminder Template", subject: "Reminder: Share Your Thoughts on {{FormName}}", body: "Hi [User Name],\n\nJust a friendly reminder to share your thoughts on {{FormName}}.\n\n[Form Link Button]\n\nYour feedback is important to us!\n\nBest,\nFeedback Flow Team", lastUpdated: "2023-07-10" },
  { id: "tpl3", name: "Internal Survey Invitation", subject: "Invitation to Participate: {{FormName}}", body: "Hello Team,\n\nPlease participate in our internal survey: {{FormName}}.\n\n[Form Link Button]\n\nThis will help us improve our processes.\n\nRegards,\nHR Department", lastUpdated: "2023-09-05" },
];

// Mock Forms for select dropdown
const mockFormsForSelect = [
  { id: "form_1", title: "Customer Satisfaction Q3" },
  { id: "form_2", title: "Employee Engagement Survey" },
  { id: "form_3", title: "New Feature Feedback" },
];

// Placeholder function for simulating backend call to save template
async function saveTemplateToBackend(templateData: EmailTemplate): Promise<EmailTemplate> {
  console.log("Simulating saving template to backend:", templateData);
  // In a real app, this would call a Cloud Function or directly update Firestore
  // to save the email template.
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
  
  // For now, return the template object as if it was saved/updated
  return { ...templateData, lastUpdated: new Date().toISOString() };
}

export default function EmailCampaignsPage() {
  const { toast } = useToast();
  const [isCreateCampaignDialogOpen, setIsCreateCampaignDialogOpen] = useState(false);
  const [isEditTemplateDialogOpen, setIsEditTemplateDialogOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>(mockTemplates); // Manage templates in state
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Form states for dialogs
  const [campaignName, setCampaignName] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [templateSubject, setTemplateSubject] = useState("");
  const [templateBody, setTemplateBody] = useState("");


  const handleCreateCampaign = () => {
    // Logic to create campaign (simulated for now)
    console.log({ campaignName, selectedFormId });
    toast({ title: "Campaign Created (Simulated)", description: `Campaign "${campaignName}" has been created.` });
    setIsCreateCampaignDialogOpen(false);
    setCampaignName("");
    setSelectedFormId("");
  };

  const handleEditTemplate = (template: EmailTemplate | null) => {
    if (template) {
      setCurrentTemplate(template);
      setTemplateSubject(template.subject);
      setTemplateBody(template.body);
    } else { // Creating a new template
      setCurrentTemplate({id: `tpl_new_${Date.now()}`, name: "New Custom Template", subject: "", body: "Dear [User Name],\n\nYour feedback on {{FormName}} is valuable.\n\n[Form Link Button]\n\nThank you!", lastUpdated: new Date().toISOString()});
      setTemplateSubject("");
      setTemplateBody("Dear [User Name],\n\nYour feedback on {{FormName}} is valuable.\n\n[Form Link Button]\n\nThank you!");
    }
    setIsEditTemplateDialogOpen(true);
  };
  
  const handleSaveTemplate = async () => {
    if (!currentTemplate) return;
    setIsSavingTemplate(true);
    try {
      const updatedTemplateData: EmailTemplate = {
        ...currentTemplate,
        subject: templateSubject,
        body: templateBody,
      };
      const savedTemplate = await saveTemplateToBackend(updatedTemplateData);
      
      // Update local state
      setEmailTemplates(prevTemplates => {
        const existingIndex = prevTemplates.findIndex(t => t.id === savedTemplate.id);
        if (existingIndex > -1) {
          const newTemplates = [...prevTemplates];
          newTemplates[existingIndex] = savedTemplate;
          return newTemplates;
        }
        return [...prevTemplates, savedTemplate]; // Add if new
      });

      toast({ title: "Template Saved", description: `Template "${savedTemplate.name}" has been updated.` });
      setIsEditTemplateDialogOpen(false);
      setCurrentTemplate(null);
    } catch (error) {
      console.error("Error saving template:", error);
      toast({ title: "Save Error", description: "Could not save the template.", variant: "destructive" });
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Simulate deleting template
    setEmailTemplates(prev => prev.filter(t => t.id !== templateId));
    toast({title: "Template Deleted (Simulated)", description: "The template has been removed."});
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-muted-foreground">Manage your email invitations and templates.</p>
        </div>
      </div>

      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => setIsCreateCampaignDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Campaign
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Your Campaigns</CardTitle>
              <CardDescription>Overview of your email campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Associated Form</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Open Rate</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockCampaigns.map((campaign) => (
                    <TableRow key={campaign.id}>
                      <TableCell className="font-medium">{campaign.name}</TableCell>
                      <TableCell>
                        <Link href={`/forms/${campaign.formId}/results`} className="hover:underline text-primary">
                          {campaign.formTitle}
                        </Link>
                      </TableCell>
                      <TableCell>
                         <span className={`px-2 py-1 text-xs rounded-full ${
                            campaign.status === 'Sent' ? 'bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--status-active-text))]' : 
                            campaign.status === 'Scheduled' ? 'bg-[hsl(var(--chart-1))]/20 text-[hsl(var(--status-scheduled-text))]' :
                            'bg-[hsl(var(--chart-2))]/20 text-[hsl(var(--status-draft-text))]'
                          }`}>
                            {campaign.status}
                          </span>
                      </TableCell>
                      <TableCell>{campaign.sentCount}</TableCell>
                      <TableCell>{campaign.openRate}%</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View Stats</Button>
                        {/* More actions like edit, duplicate, delete */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
           <div className="flex justify-end mb-4">
            <Button onClick={() => handleEditTemplate(null)}>
              <Palette className="mr-2 h-4 w-4" /> Create New Template
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Reusable email templates for your campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Subject Line</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emailTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>{template.subject}</TableCell>
                      <TableCell>{new Date(template.lastUpdated).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleEditTemplate(template)}>
                          <Edit3 className="mr-1 h-3 w-3" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleDeleteTemplate(template.id)}>
                          <Trash2 className="mr-1 h-3 w-3" /> Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                   {emailTemplates.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-4">No templates created yet.</TableCell>
                     </TableRow>
                   )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateCampaignDialogOpen} onOpenChange={setIsCreateCampaignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Email Campaign</DialogTitle>
            <DialogDescription>Set up a new email campaign to collect feedback.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input id="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="e.g., Q4 Product Feedback" />
            </div>
            <div>
              <Label htmlFor="selectForm">Select Form</Label>
              <Select value={selectedFormId} onValueChange={setSelectedFormId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a form to associate" />
                </SelectTrigger>
                <SelectContent>
                  {mockFormsForSelect.map(form => (
                    <SelectItem key={form.id} value={form.id}>{form.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Add fields for selecting recipients, scheduling, etc. */}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCampaignDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateCampaign}>Create Campaign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {currentTemplate && (
        <Dialog open={isEditTemplateDialogOpen} onOpenChange={setIsEditTemplateDialogOpen}>
            <DialogContent className="sm:max-w-2xl"> {/* Wider dialog for editor */}
            <DialogHeader>
                <DialogTitle>Edit Email Template: {currentTemplate.name}</DialogTitle>
                <DialogDescription>{`Customize the subject and body of your email. Use placeholders like {{FormName}} and [Form Link Button].`}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                    <Label htmlFor="templateSubject">Subject Line</Label>
                    <Input id="templateSubject" value={templateSubject} onChange={(e) => setTemplateSubject(e.target.value)} disabled={isSavingTemplate}/>
                </div>
                <div>
                    <Label htmlFor="templateBody">Email Body</Label>
                    <Textarea 
                        id="templateBody" 
                        value={templateBody} 
                        onChange={(e) => setTemplateBody(e.target.value)} 
                        rows={18} // Increased rows
                        placeholder="Craft your email content here..."
                        className="resize-y min-h-[200px]" // Allow vertical resize
                        disabled={isSavingTemplate}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                        Placeholders: `{"{{FormName}}"}`, `{"{{UserName}}"}` (if available), `{"[Form Link Button]"}` (will be replaced by a button).
                    </p>
                </div>
                {/* Basic editor controls could be added here: Text size, color (simplified) */}
                <div className="flex gap-2 items-center border-t pt-4">
                    <Label className="text-sm">Simplified Editor Controls (Placeholder):</Label>
                    <Button variant="outline" size="sm" disabled>Text Size</Button>
                    <Button variant="outline" size="sm" disabled>Text Color</Button>
                    <Button variant="outline" size="sm" disabled>Bold</Button>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsEditTemplateDialogOpen(false)} disabled={isSavingTemplate}>Cancel</Button>
                <Button onClick={handleSaveTemplate} disabled={isSavingTemplate}>
                  {isSavingTemplate ? "Saving..." : "Save Template"}
                </Button>
            </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
