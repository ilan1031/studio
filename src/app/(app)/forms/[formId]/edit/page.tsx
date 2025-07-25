
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormDescription as ShadcnFormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import * as z from "zod";
import { PlusCircle, Trash2, Sparkles, Wand2, Settings2, X, ChevronDown, ChevronUp, GripVertical, Brain, Eye, Loader2, Star, Save, FileTextIcon as PageBreakIcon } from "lucide-react";
import { generateSurveyQuestions, GenerateSurveyQuestionsInput, SuggestedQuestion } from "@/ai/flows/generate-survey-questions";
import { useToast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { FormFieldOption, FormFieldType, FormSchema as AppFormSchema, QuestionSchema } from "@/types";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { useRouter, useParams } from "next/navigation";

const formFieldSchema = z.object({
  id: z.string().default(() => `field_${Math.random().toString(36).substr(2, 9)}`),
  label: z.string().min(1, "Label is required"),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox", "rating", "date", "email", "number", "nps", "pagebreak"]),
  required: z.boolean().default(false),
  placeholder: z.string().optional(),
  options: z.array(z.object({ label: z.string().min(1), value: z.string().min(1) })).optional(),
  description: z.string().optional(),
});

const editFormSchemaValidation = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).min(1, "Add at least one field"),
  isAnonymous: z.boolean().default(false),
  aiMode: z.enum(["dynamic", "assisted_creation", "none"]).default("none"),
});

type EditFormValues = z.infer<typeof editFormSchemaValidation>;

// FormPreview Component
function FormPreview({ formData }: { formData: Partial<EditFormValues> }) {
  if (!formData || !formData.fields) {
    return (
      <Card className="shadow-inner border-dashed">
        <CardHeader>
          <CardTitle>Form Preview</CardTitle>
          <CardDescription>Preview will appear here as you build.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Start adding fields to see your form.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-inner">
      <CardHeader>
        <CardTitle>{formData.title || "Untitled Form"}</CardTitle>
        {formData.description && <CardDescription>{formData.description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {formData.fields.map((field, index) => (
          <div key={field.id || index} className="p-3 border rounded-md bg-muted/20">
            {field.type === "pagebreak" ? (
                 <div className="flex items-center space-x-2 py-2 my-2 border-y border-dashed border-border bg-secondary/30 rounded">
                    <PageBreakIcon className="h-4 w-4 text-muted-foreground mx-2" />
                    <span className="text-sm font-medium text-muted-foreground flex-grow">{field.label || "Next Page"}</span>
                    <hr className="flex-grow border-border invisible" />
                </div>
            ) : (
                <>
                    <Label className="font-medium">{field.label} {field.required && <span className="text-destructive">*</span>}</Label>
                    {field.description && <p className="text-xs text-muted-foreground mb-1">{field.description}</p>}
                    {field.type === "text" && <Input type="text" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "email" && <Input type="email" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "number" && <Input type="number" placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "textarea" && <Textarea placeholder={field.placeholder} disabled className="mt-1 bg-background/50" />}
                    {field.type === "date" && <Input type="date" disabled className="mt-1 bg-background/50" />}
                    {field.type === "rating" && (
                    <div className="flex space-x-1 mt-1">
                        {[1, 2, 3, 4, 5].map(starValue => (
                        <Star key={starValue} className="h-5 w-5 text-muted-foreground/50" />
                        ))}
                    </div>
                    )}
                    {field.type === "select" && (
                    <Select disabled>
                        <SelectTrigger className="mt-1 bg-background/50">
                        <SelectValue placeholder={field.placeholder || "Select an option"} />
                        </SelectTrigger>
                        <SelectContent>
                        {field.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    )}
                    {field.type === "radio" && field.options && (
                    <div className="space-y-1 mt-1">
                        {field.options.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2">
                             <input type="radio" id={`${field.id}-preview-edit-${opt.value}`} value={opt.value} name={`${field.id}-preview-edit`} disabled />
                            <Label htmlFor={`${field.id}-preview-edit-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                        </div>
                        ))}
                    </div>
                    )}
                    {field.type === "checkbox" && field.options && (
                    <div className="space-y-1 mt-1">
                        {field.options.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2">
                            <input type="checkbox" id={`${field.id}-preview-edit-${opt.value}`} value={opt.value} disabled />
                            <Label htmlFor={`${field.id}-preview-edit-${opt.value}`} className="font-normal text-muted-foreground/80">{opt.label}</Label>
                        </div>
                        ))}
                    </div>
                    )}
                    {field.type === "nps" && (
                        <div className="flex flex-wrap gap-1 mt-1">
                            {[...Array(11).keys()].map(i => (
                            <Button key={i} variant="outline" size="sm" disabled className="h-7 w-7 p-0">{i}</Button>
                            ))}
                        </div>
                    )}
                </>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}


export default function EditFormPage() {
  const paramsHook = useParams(); // Use the hook
  const formId = paramsHook.formId as string; // Extract formId
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingForm, setIsSavingForm] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchemaValidation),
    defaultValues: {
      title: "",
      description: "",
      fields: [],
      isAnonymous: false,
      aiMode: "assisted_creation",
    },
  });

  const watchedFormData = form.watch();

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "fields",
  });

  const ensureOptionValues = (options?: SuggestedQuestion['options']): FormFieldOption[] => {
    if (!options || options.length === 0) return [];
    const valueMap = new Map<string, number>();
    return options.map(opt => {
      let value = opt.value || opt.label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!value.trim()) value = `option-${Math.random().toString(36).substr(2, 5)}`;
      
      const originalValue = value;
      let count = valueMap.get(originalValue) || 0;
      if (valueMap.has(originalValue)) {
          value = `${originalValue}_${count + 1}`;
          valueMap.set(originalValue, count + 1);
      } else {
          valueMap.set(originalValue, 1);
      }
      return { label: opt.label, value };
    });
  };

  const loadForm = useCallback(async (id: string) => {
    if (!id) { 
        setIsLoading(false);
        toast({ title: "Error", description: "Form ID is missing. Cannot load form.", variant: "destructive" });
        router.push("/forms");
        return;
    }
    setIsLoading(true);
    try {
      const formDocRef = doc(db, "surveys", id);
      const formDocSnap = await getDoc(formDocRef);

      if (formDocSnap.exists()) {
        const formData = formDocSnap.data() as AppFormSchema;
        const currentUser = auth.currentUser;
        if (currentUser && formData.createdBy !== currentUser.uid) {
            toast({ title: "Unauthorized", description: "You are not authorized to edit this form.", variant: "destructive" });
            router.push("/forms");
            return;
        }

        form.reset({
          title: formData.title,
          description: formData.description || "",
          fields: formData.fields.map(f => ({
            id: f.id,
            label: f.text, 
            type: f.type,
            required: f.type === "pagebreak" ? false : (f.required || false),
            placeholder: f.placeholder || "",
            options: f.options?.map(opt => ({ label: opt.label, value: opt.value })) || [],
            description: f.description || "",
          })),
          isAnonymous: formData.isAnonymous || false,
          aiMode: formData.aiMode || "assisted_creation",
        });
      } else {
        toast({ title: "Error", description: "Form not found.", variant: "destructive" });
        router.push("/forms");
      }
    } catch (error) {
      console.error("Error loading form:", error);
      toast({ title: "Error", description: "Could not load the form data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [form, router, toast]);

  useEffect(() => {
    if (formId) {
      loadForm(formId);
    } else {
      setIsLoading(false); 
      // Handle case where formId might be undefined initially if needed,
      // though useParams usually provides it if the route matches.
    }
  }, [formId, loadForm]);


  const handleGenerateQuestions = async () => {
    if (!aiTopic.trim()) {
      toast({ title: "Error", description: "Please enter a topic or paste questions for AI generation.", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const input: GenerateSurveyQuestionsInput = { topic: aiTopic };
      const result = await generateSurveyQuestions(input);
      if (result && result.questions && result.questions.length > 0) {
        result.questions.forEach(question => {
          append({
            id: `field_${Math.random().toString(36).substr(2, 9)}`,
            label: question.label,
            type: question.type as FormFieldType,
            required: false,
            placeholder: "",
            options: ensureOptionValues(question.options),
            description: "",
          });
        });
        toast({ title: "Success", description: `AI added ${result.questions.length} questions directly to your form.` });
        setAiTopic("");
      } else {
        toast({ title: "No Questions Generated", description: "The AI couldn't generate questions for this topic.", variant: "default" });
      }
    } catch (error) {
      console.error("AI Question Generation Error:", error);
      toast({ title: "Error", description: "An error occurred while generating questions.", variant: "destructive" });
    }
    setIsGenerating(false);
  };

  async function onSubmit(data: EditFormValues) {
    if (!formId) {
        toast({ title: "Error", description: "Form ID is missing. Cannot save.", variant: "destructive"});
        return;
    }
    setIsSavingForm(true);
    try {
      const questionsForDb: QuestionSchema[] = data.fields.map(f => ({
        id: f.id,
        surveyId: formId, 
        text: f.label,
        type: f.type as FormFieldType,
        options: f.options || [],
        required: f.type === "pagebreak" ? false : f.required,
        placeholder: f.placeholder || "",
        description: f.description || "",
         // minRating and maxRating are not part of formFieldSchema yet, add if needed
      }));

      const surveyDataForDb: Partial<AppFormSchema> = { 
        title: data.title,
        description: data.description || "",
        fields: questionsForDb,
        updatedAt: serverTimestamp() as Timestamp, 
        isAnonymous: data.isAnonymous,
        aiMode: data.aiMode,
        // createdBy and createdAt should not be overwritten on update
      };

      const formDocRef = doc(db, "surveys", formId);
      await updateDoc(formDocRef, surveyDataForDb);

      toast({ title: "Form Updated Successfully!", description: `Form "${data.title}" has been saved.` });
      router.push("/forms");
    } catch (error) {
      console.error("Error updating form:", error);
      toast({ title: "Save Error", description: "Could not update the form.", variant: "destructive" });
    } finally {
      setIsSavingForm(false);
    }
  }
  
  const addFieldOption = (fieldIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    form.setValue(`fields.${fieldIndex}.options`, [...currentOptions, { label: `Option ${currentOptions.length + 1}`, value: `option_${currentOptions.length + 1}` }]);
  };

  const removeFieldOption = (fieldIndex: number, optionIndex: number) => {
    const currentOptions = form.getValues(`fields.${fieldIndex}.options`) || [];
    form.setValue(`fields.${fieldIndex}.options`, currentOptions.filter((_, i) => i !== optionIndex));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading form editor...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Edit Form: {form.getValues("title")}</h1>
              <p className="text-muted-foreground">Modify your form details and fields below.</p>
            </div>
            <Button type="submit" size="lg" disabled={isSavingForm || isGenerating}>
              {isSavingForm ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Changes...</> : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Form Builder */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Form Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Title</FormLabel>
                        <FormControl><Input placeholder="e.g., Customer Satisfaction Survey" {...field} disabled={isSavingForm || isGenerating} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form Description (Optional)</FormLabel>
                        <FormControl><Textarea placeholder="Provide a brief description or instructions for your form." {...field} disabled={isSavingForm || isGenerating} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>Form Fields</CardTitle>
                  <CardDescription>Modify questions for your form. Drag to reorder. </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px] pr-3">
                  {fields.map((fieldItem, index) => (
                    <Accordion key={fieldItem.id} type="single" collapsible className="w-full mb-2 border rounded-md">
                      <AccordionItem value={`item-${index}`} className="border-b-0">
                        <AccordionTrigger className="p-3 hover:bg-muted/50 rounded-t-md">
                          <div className="flex items-center w-full">
                            <GripVertical className="h-5 w-5 text-muted-foreground mr-2 cursor-grab" />
                            <span className="font-medium truncate flex-1 text-left">
                              {form.watch(`fields.${index}.label`) || `Field ${index + 1}`} ({form.watch(`fields.${index}.type`)})
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 space-y-4 bg-background rounded-b-md border-t">
                          <FormField
                            control={form.control}
                            name={`fields.${index}.label`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>{form.watch(`fields.${index}.type`) === 'pagebreak' ? 'New Page Label (Optional)' : 'Field Label'}</FormLabel>
                                <FormControl><Input placeholder={form.watch(`fields.${index}.type`) === 'pagebreak' ? 'e.g., Section 2: Details' : "e.g., Your Name"} {...fieldProps} disabled={isSavingForm || isGenerating} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`fields.${index}.type`}
                            render={({ field: fieldProps }) => (
                              <FormItem>
                                <FormLabel>Field Type</FormLabel>
                                <Select onValueChange={(value) => {
                                  fieldProps.onChange(value as FormFieldType);
                                  if (!["select", "radio", "checkbox"].includes(value)) {
                                    form.setValue(`fields.${index}.options`, []);
                                  } else if (!form.getValues(`fields.${index}.options`)?.length) {
                                    form.setValue(`fields.${index}.options`, [{ label: "Option 1", value: "option_1" }]);
                                  }
                                  if (value === 'pagebreak') {
                                      form.setValue(`fields.${index}.label`, form.getValues(`fields.${index}.label`) || 'Next Page');
                                  }
                                }}
                                defaultValue={fieldProps.value}
                                disabled={isSavingForm || isGenerating}
                                >
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select field type" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {(["text", "textarea", "select", "radio", "checkbox", "rating", "date", "email", "number", "nps", "pagebreak"] as FormFieldType[]).map(type => (
                                      <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                {form.watch(`fields.${index}.type`) === 'pagebreak' && (
                                  <ShadcnFormDescription className="mt-1 text-xs">
                                    This creates a new page for the respondent. Subsequent fields will appear on this new page.
                                  </ShadcnFormDescription>
                                )}
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch(`fields.${index}.type`) !== 'pagebreak' && (
                            <>
                              {(form.watch(`fields.${index}.type`) === "select" || form.watch(`fields.${index}.type`) === "radio" || form.watch(`fields.${index}.type`) === "checkbox") && (
                                <div className="space-y-2">
                                  <FormLabel>Options</FormLabel>
                                  {form.watch(`fields.${index}.options`)?.map((option, optIndex) => (
                                    <div key={optIndex} className="flex items-center gap-2">
                                      <FormField
                                        control={form.control}
                                        name={`fields.${index}.options.${optIndex}.label`}
                                        render={({ field: fieldProps }) => (
                                          <Input placeholder="Option Label" {...fieldProps} className="flex-1" disabled={isSavingForm || isGenerating} />
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name={`fields.${index}.options.${optIndex}.value`}
                                        render={({ field: fieldProps }) => (
                                          <Input placeholder="Option Value (auto-if-blank)" {...fieldProps} className="flex-1" 
                                            disabled={isSavingForm || isGenerating}
                                            onBlur={(e) => { 
                                              const label = form.getValues(`fields.${index}.options.${optIndex}.label`);
                                              if (label && !e.target.value) {
                                                fieldProps.onChange(label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
                                              } else {
                                                fieldProps.onChange(e.target.value);
                                              }
                                            }}
                                          />
                                        )}
                                      />
                                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFieldOption(index, optIndex)} disabled={isSavingForm || isGenerating}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  ))}
                                  <Button type="button" variant="outline" size="sm" onClick={() => addFieldOption(index)} disabled={isSavingForm || isGenerating}>
                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Option
                                  </Button>
                                </div>
                              )}
                              <FormField
                                control={form.control}
                                name={`fields.${index}.placeholder`}
                                render={({ field: fieldProps }) => (
                                  <FormItem>
                                    <FormLabel>Placeholder (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g., Enter your feedback here" {...fieldProps} disabled={isSavingForm || isGenerating} /></FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name={`fields.${index}.description`}
                                render={({ field: fieldProps }) => (
                                  <FormItem>
                                    <FormLabel>Helper Text (Optional)</FormLabel>
                                    <FormControl><Textarea placeholder="Additional instructions for this field" {...fieldProps} rows={2} disabled={isSavingForm || isGenerating} /></FormControl>
                                  </FormItem>
                                )}
                              />
                              <FormField
                                    control={form.control}
                                    name={`fields.${index}.required`}
                                    render={({ field: fieldProps }) => (
                                    <FormItem className="flex flex-row items-center space-x-2 space-y-0 pt-2">
                                        <FormControl><Switch checked={fieldProps.value} onCheckedChange={fieldProps.onChange} disabled={isSavingForm || isGenerating} /></FormControl>
                                        <FormLabel className="font-normal">Required</FormLabel>
                                    </FormItem>
                                    )}
                                />
                            </>
                          )}
                          <div className="flex items-center justify-end pt-2">
                            <Button type="button" variant="destructive" onClick={() => remove(index)} size="sm" disabled={isSavingForm || isGenerating}>
                              <Trash2 className="mr-2 h-4 w-4" /> Remove Field
                            </Button>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  ))}
                  </ScrollArea>
                  <div className="flex gap-2 mt-4">
                    <Button type="button" variant="outline" onClick={() => append({ id: `field_${Math.random().toString(36).substr(2, 9)}`, label: "", type: "text", required: false, options: [] })} className="w-full" disabled={isSavingForm || isGenerating}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New Field
                    </Button>
                     <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => append({ id: `field_${Math.random().toString(36).substr(2, 9)}`, label: "Next Page", type: "pagebreak", required: false })} 
                        className="w-full" 
                        disabled={isSavingForm || isGenerating}
                    >
                        <PageBreakIcon className="mr-2 h-4 w-4" /> Add New Page
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Right Column: Preview, AI Tools & Settings */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg sticky top-20"> 
                <CardHeader>
                  <CardTitle className="flex items-center"><Eye className="mr-2 h-5 w-5 text-primary" /> Live Form Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[calc(100vh-20rem)] max-h-[500px]"> 
                    <FormPreview formData={watchedFormData} />
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center"><Sparkles className="mr-2 h-5 w-5 text-primary" /> AI Question Generator</CardTitle>
                  <CardDescription>Enter a topic, or paste questions, to have AI add them directly to your form.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="ai-topic">Topic / Paste Questions</Label>
                    <Textarea 
                        id="ai-topic" 
                        placeholder="e.g., Customer service experience, or paste '1. Favorite color? (Red, Blue)'" 
                        value={aiTopic} 
                        onChange={(e) => setAiTopic(e.target.value)}
                        rows={3}
                        disabled={isGenerating || isSavingForm}
                    />
                  </div>
                  <Button onClick={handleGenerateQuestions} disabled={isGenerating || isSavingForm} className="w-full">
                    {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</> : <><Wand2 className="mr-2 h-4 w-4" /> Generate & Add Questions</>}
                  </Button>
                </CardContent>
              </Card>

              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center"><Settings2 className="mr-2 h-5 w-5" /> Form Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="isAnonymous"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Anonymous Responses</FormLabel>
                          <ShadcnFormDescription>
                            Collect responses without identifying users.
                          </ShadcnFormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isSavingForm || isGenerating}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="aiMode"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel className="flex items-center"><Brain className="mr-2 h-4 w-4" /> AI Mode</FormLabel>
                          <ShadcnFormDescription>
                            Control AI behavior for this form.
                          </ShadcnFormDescription>
                        </div>
                        <FormControl>
                           <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isSavingForm || isGenerating}>
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Select AI Mode" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="assisted_creation">Assisted Creation</SelectItem>
                              <SelectItem value="dynamic">Dynamic Follow-ups (Future)</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-8">
            <Button variant="outline" type="button" onClick={() => router.push("/forms")} disabled={isSavingForm || isGenerating}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={isSavingForm || isGenerating}>
              {isSavingForm ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving Changes...</> : <><Save className="mr-2 h-5 w-5" /> Save Changes</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

