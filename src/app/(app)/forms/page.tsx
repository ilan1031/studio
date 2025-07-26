
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, PlusCircle, Eye, Edit2, Trash2, Share2, BarChartHorizontalBig, FileTextIcon as PageBreakIcon, Loader2, Copy, Star, QrCode, Download } from "lucide-react";
import Link from "next/link";
import type { FormSchema, QuestionSchema, FormFieldOption, FormFieldType } from "@/types";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, Timestamp, deleteDoc, doc, getCountFromServer } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { QRCodeCanvas } from 'qrcode.react';


// Add a status field to FormSchema for UI display, if not directly in DB
interface DisplayFormSchema extends FormSchema {
  displayStatus?: 'Active' | 'Closed' | 'Draft';
  responseCount?: number;
}

export default function FormsPage() {
  const [forms, setForms] = useState<DisplayFormSchema[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const currentUser = auth.currentUser;

  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [shareLink, setShareLink] = useState("");
  const [selectedFormTitleForShare, setSelectedFormTitleForShare] = useState("");
  const qrCodeRef = useRef<HTMLDivElement>(null);


  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedFormForPreview, setSelectedFormForPreview] = useState<DisplayFormSchema | null>(null);


  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      setForms([]);
      return;
    }

    setIsLoading(true);
    console.log("FormsPage: Setting up Firestore listener for user:", currentUser.uid);
    const q = query(
      collection(db, "surveys"),
      where("createdBy", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const formsDataPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt as string;
        const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt as string;

        // Fetch response count for this specific form
        let responseCount = 0;
        try {
          const responsesQuery = query(collection(db, "responses"), where("formId", "==", docSnap.id));
          const snapshot = await getCountFromServer(responsesQuery);
          responseCount = snapshot.data().count;
        } catch (countError) {
          console.error(`Error fetching response count for form ${docSnap.id}:`, countError);
          // Keep responseCount as 0 or handle as needed
        }

        return {
          ...data,
          id: docSnap.id,
          createdAt,
          updatedAt,
          responseCount: responseCount,
          displayStatus: data.status || "Active",
          fields: data.fields as QuestionSchema[],
        } as DisplayFormSchema;
      });

      const fetchedFormsWithCounts = await Promise.all(formsDataPromises);
      console.log("FormsPage: Fetched forms with counts:", fetchedFormsWithCounts.length);
      setForms(fetchedFormsWithCounts);
      setIsLoading(false);
    }, (error) => {
      console.error("FormsPage: Error fetching forms: ", error);
      toast({ title: "Error", description: "Could not fetch forms. Check console for details.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      console.log("FormsPage: Unsubscribing from Firestore listener.");
      unsubscribe();
    }
  }, [currentUser, toast]);

  const handleDeleteForm = async (form: DisplayFormSchema) => {
    console.log("Attempting to delete form object:", form);
    if (!form || !form.id) {
      toast({ title: "Error", description: "Invalid Form ID. Cannot delete.", variant: "destructive" });
      console.error("handleDeleteForm: Invalid or missing form object or formId.");
      return;
    }
    const formId = form.id;
    console.log(`Form ID for deletion: ${formId}`);

    if (!currentUser) {
      toast({ title: "Authentication Error", description: "You must be logged in to delete a form.", variant: "destructive" });
      console.error("handleDeleteForm: User not authenticated at time of delete attempt.");
      return;
    }
    console.log(`Current user UID for delete operation: ${currentUser.uid}`);
    console.log(`Form createdBy: ${form.createdBy}`);

    if (currentUser.uid !== form.createdBy) {
        toast({ title: "Unauthorized", description: "Client-side check: You are not the creator of this form. Deletion blocked.", variant: "destructive" });
        console.warn("Client-side check: User UID does not match form creator UID. Deletion blocked.");
        return;
    }

    if (!confirm(`Are you sure you want to delete the form "${form.title}"? This action cannot be undone.`)) {
      console.log("Form deletion cancelled by user.");
      return;
    }

    try {
      console.log(`Proceeding with Firestore deletion of form [${formId}] from surveys collection.`);
      const formDocRef = doc(db, "surveys", formId);
      await deleteDoc(formDocRef);
      toast({ title: "Form Deleted", description: `Form "${form.title}" has been successfully deleted.` });
      console.log(`Form [${formId}] successfully deleted from Firestore.`);
    } catch (error) {
      console.error(`Error deleting form [${formId}] from Firestore:`, error);
      toast({ title: "Delete Error", description: "Could not delete the form. Check console for details.", variant: "destructive" });
    }
  };


  const handleShareForm = (formId: string, formTitle: string) => {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
    setShareLink(`${currentOrigin}/forms/${formId}/respond`);
    setSelectedFormTitleForShare(formTitle);
    setIsShareDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink).then(() => {
      toast({ title: "Link Copied!", description: "The shareable link has been copied to your clipboard." });
    }, (err) => {
      toast({ title: "Copy Failed", description: "Could not copy the link.", variant: "destructive" });
    });
  };

  const handleDownloadQR = () => {
    if (qrCodeRef.current) {
      const canvas = qrCodeRef.current.querySelector('canvas');
      if (canvas) {
        const pngUrl = canvas
          .toDataURL("image/png")
          .replace("image/png", "image/octet-stream"); // Prompt download
        let downloadLink = document.createElement("a");
        downloadLink.href = pngUrl;
        downloadLink.download = `${selectedFormTitleForShare.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        toast({ title: "QR Code Downloading", description: "Your QR code image will be downloaded." });
      } else {
        toast({ title: "Download Error", description: "Could not find QR code canvas.", variant: "destructive" });
      }
    }
  };

  const handlePreviewForm = (formToPreview: DisplayFormSchema) => {
    setSelectedFormForPreview(formToPreview);
    setIsPreviewDialogOpen(true);
  };


  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your forms...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Your Forms</h1>
            <p className="text-muted-foreground">Manage, edit, and analyze your feedback forms.</p>
          </div>
          <Button asChild>
            <Link href="/forms/create">
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Form
            </Link>
          </Button>
        </div>

        {forms.length === 0 && !isLoading ? (
          <Card className="text-center py-12 shadow-lg">
            <CardHeader>
              <PageBreakIcon className="mx-auto h-12 w-12 text-muted-foreground" />
              <CardTitle className="mt-4 text-2xl font-semibold">No Forms Yet</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                It looks like you haven't created any forms. Get started by creating your first one!
              </CardDescription>
            </CardContent>
            <CardFooter className="justify-center">
              <Button asChild>
                <Link href="/forms/create">
                  <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Form
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Responses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium">
                        <Link href={`/forms/${form.id}/results`} className="hover:underline text-primary">
                          {form.title}
                        </Link>
                        {form.isAnonymous && <Badge variant="outline" className="ml-2 text-xs">Anonymous</Badge>}
                      </TableCell>
                      <TableCell>{form.responseCount ?? 0}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          form.displayStatus === 'Active' ? 'bg-[hsl(var(--chart-4))]/20 text-[hsl(var(--status-active-text))]' :
                          form.displayStatus === 'Closed' ? 'bg-[hsl(var(--destructive))]/20 text-[hsl(var(--status-closed-text))]' :
                          form.displayStatus === 'Draft' ? 'bg-[hsl(var(--chart-2))]/20 text-[hsl(var(--status-draft-text))]' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {form.displayStatus || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(form.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/forms/${form.id}/results`}><BarChartHorizontalBig className="mr-2 h-4 w-4" /> View Results</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/forms/${form.id}/edit`}><Edit2 className="mr-2 h-4 w-4" /> Edit Form</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePreviewForm(form)}>
                              <Eye className="mr-2 h-4 w-4" /> Preview Form
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleShareForm(form.id, form.title)}>
                              <Share2 className="mr-2 h-4 w-4" /> Share Options
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10" onClick={() => handleDeleteForm(form)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Form
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Form Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Form: {selectedFormTitleForShare}</DialogTitle>
            <DialogDescription>
              Copy the link or scan/download the QR code to share your form.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4 items-center">
            <div className="flex items-center space-x-2 w-full">
              <Input value={shareLink} readOnly className="flex-1" />
              <Button onClick={copyToClipboard} size="icon" variant="outline" title="Copy link">
                <Copy className="h-4 w-4" />
                <span className="sr-only">Copy link</span>
              </Button>
            </div>
            {shareLink && (
              <div ref={qrCodeRef} className="p-4 border rounded-md bg-white inline-block">
                <QRCodeCanvas 
                  value={shareLink} 
                  size={192} 
                  bgColor="#FFFFFF" 
                  fgColor="#000000" 
                  level="M" 
                />
              </div>
            )}
            {shareLink && (
                 <Button onClick={handleDownloadQR} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" /> Download QR Code
                 </Button>
            )}
            <p className="text-xs text-muted-foreground">Anyone with the link or QR code can respond.</p>
          </div>
          <CardFooter className="mt-4 p-0 justify-end">
             <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>Close</Button>
          </CardFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Form Dialog */}
      {selectedFormForPreview && (
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="sm:max-w-2xl shadow-xl">
            <DialogHeader>
              <DialogTitle>Preview: {selectedFormForPreview.title}</DialogTitle>
              {selectedFormForPreview.description && <DialogDescription>{selectedFormForPreview.description}</DialogDescription>}
            </DialogHeader>
            <ScrollArea className="max-h-[70vh] p-1 pr-3 my-4">
              <div className="space-y-6 p-2">
                {selectedFormForPreview.fields.map((field, index) => (
                  <div key={field.id || `preview-field-${index}`} className="p-4 border rounded-lg bg-card shadow-sm">
                     {field.type === "pagebreak" ? (
                        <div className="flex items-center space-x-2 py-2 my-2 border-y border-dashed border-border bg-secondary/30 rounded">
                            <PageBreakIcon className="h-4 w-4 text-muted-foreground mx-2" />
                            <span className="text-sm font-medium text-muted-foreground flex-grow">{field.text || "Next Page"}</span>
                        </div>
                    ) : (
                        <>
                            <Label className="font-semibold text-base text-card-foreground">{field.text} {field.required && <span className="text-destructive">*</span>}</Label>
                            {field.description && <p className="text-xs text-muted-foreground mb-2 mt-1">{field.description}</p>}

                            {field.type === "text" && <Input type="text" placeholder={field.placeholder} disabled className="mt-1 bg-input/70" />}
                            {field.type === "email" && <Input type="email" placeholder={field.placeholder} disabled className="mt-1 bg-input/70" />}
                            {field.type === "number" && <Input type="number" placeholder={field.placeholder} disabled className="mt-1 bg-input/70" />}
                            {field.type === "textarea" && <Textarea placeholder={field.placeholder} disabled className="mt-1 bg-input/70" />}
                            {field.type === "date" && <Input type="date" disabled className="mt-1 bg-input/70" />}

                            {field.type === "rating" && (
                            <div className="flex space-x-1 mt-2">
                                {[...(Array(field.maxRating || 5).keys())].map(i => i + (field.minRating || 1)).map(starValue => (
                                <Star key={starValue} className="h-6 w-6 text-muted-foreground/50" />
                                ))}
                            </div>
                            )}

                            {field.type === "select" && (
                            <Select disabled>
                                <SelectTrigger className="mt-1 bg-input/70">
                                <SelectValue placeholder={field.placeholder || "Select an option"} />
                                </SelectTrigger>
                                <SelectContent>
                                {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            )}

                            {field.type === "radio" && field.options && (
                            <RadioGroup disabled className="space-y-2 mt-2">
                                {field.options.map(opt => (
                                <div key={opt.value} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt.value} id={`${field.id}-preview-list-${opt.value}`} disabled />
                                    <Label htmlFor={`${field.id}-preview-list-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                                </div>
                                ))}
                            </RadioGroup>
                            )}

                            {field.type === "checkbox" && field.options && (
                            <div className="space-y-2 mt-2">
                                {field.options.map(opt => (
                                <div key={opt.value} className="flex items-center space-x-2">
                                    <Checkbox id={`${field.id}-preview-list-${opt.value}`} value={opt.value} disabled />
                                    <Label htmlFor={`${field.id}-preview-list-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                                </div>
                                ))}
                            </div>
                            )}

                            {field.type === "nps" && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                    {[...Array(11).keys()].map(i => (
                                    <Button key={i} variant="outline" size="sm" disabled className="h-7 w-7 p-0">{i}</Button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                  </div>
                ))}
                 {selectedFormForPreview.isAnonymous && (
                  <p className="text-sm text-muted-foreground italic mt-4">This form collects responses anonymously.</p>
                )}
              </div>
            </ScrollArea>
            <CardFooter className="mt-2 p-0 justify-end">
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>Close Preview</Button>
            </CardFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

