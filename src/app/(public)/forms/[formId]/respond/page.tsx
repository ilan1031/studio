
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription as ShadcnFormDescription } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import type { FormSchema, QuestionSchema as AppQuestionSchema, FormResponse } from "@/types"; 
import { Star, Loader2 } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useRouter } from 'next/navigation';


const generateZodSchema = (fields: AppQuestionSchema[]) => {
  const shape: Record<string, z.ZodTypeAny> = {};
  fields.forEach(field => {
    let zodType: z.ZodTypeAny;
    switch (field.type) {
      case "text":
      case "textarea":
      case "radio": 
      case "select": 
        zodType = z.string();
        if (field.required) zodType = zodType.min(1, `${field.text} is required.`);
        else zodType = zodType.optional().or(z.literal("")); 
        break;
      case "email":
        zodType = z.string();
        if (field.required) zodType = zodType.email({ message: `${field.text} must be a valid email.` });
        else zodType = zodType.email({ message: `${field.text} must be a valid email.` }).optional().or(z.literal(""));
        break;
      case "number":
      case "rating": 
      case "nps":
        zodType = z.coerce.number({invalid_type_error: `${field.text} must be a number.`});
        if (field.required) {
            if (field.type === "rating") zodType = zodType.min(field.minRating ?? 1, `${field.text} is required.`);
            else if (field.type === "nps") zodType = zodType.min(0).max(10); // NPS is 0-10
            else zodType = zodType.min(1, `${field.text} is required.`);
        } else {
            zodType = zodType.optional();
        }
        break;
      case "checkbox": 
        zodType = z.array(z.string()).optional();
        if (field.required) zodType = z.array(z.string()).min(1, `Please select at least one option for ${field.text}.`);
        break;
      case "date":
        zodType = z.string(); 
        if (field.required) zodType = zodType.min(1, `${field.text} is required.`);
        else zodType = zodType.optional().or(z.literal(""));
        break;
      default:
        zodType = z.any().optional();
    }
    shape[field.id] = zodType;
  });
  return z.object(shape);
};

async function saveResponseToBackend(formId: string, responseData: Record<string, any>, isAnonymous: boolean): Promise<FormResponse> {
  console.log(`Saving response for form ${formId} to Firestore:`, responseData);
  
  const currentUser = auth.currentUser;
  const submissionData: any = {
    formId: formId,
    answers: responseData,
    timestamp: serverTimestamp(),
  };

  if (currentUser && !isAnonymous) {
    submissionData.userId = currentUser.uid;
  }
  
  const docRef = await addDoc(collection(db, "responses"), submissionData);
  
  // Simulate triggering a confirmation email (placeholder)
  // if (currentUser && !isAnonymous && currentUser.email) {
  //   console.log(`TODO: Trigger Cloud Function to send confirmation email to ${currentUser.email}`);
  // } else if (responseData.email_field_id && !isAnonymous) { // Assuming an email field exists
  //   console.log(`TODO: Trigger Cloud Function to send confirmation email to ${responseData.email_field_id}`);
  // }


  return {
    id: docRef.id,
    formId: formId,
    answers: responseData,
    timestamp: new Date().toISOString(), // Approximate, serverTimestamp is accurate in DB
    userId: (currentUser && !isAnonymous) ? currentUser.uid : undefined,
  };
}


export default function RespondToFormPage({ params }: { params: { formId: string } }) {
  const { formId } = params;
  const { toast } = useToast();
  const router = useRouter();
  const [formSchema, setFormSchema] = useState<FormSchema | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);

  const dynamicFormSchema = formSchema ? generateZodSchema(formSchema.fields) : z.object({});
  type DynamicFormValues = z.infer<typeof dynamicFormSchema>;
  
  const formHook = useForm<DynamicFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {}, // Will be set in useEffect
  });
  
  const loadFormSchema = useCallback(async (id: string) => {
    setIsLoadingSchema(true);
    try {
      const formDocRef = doc(db, "surveys", id);
      const formDocSnap = await getDoc(formDocRef);
      if (formDocSnap.exists()) {
        const fetchedForm = { id: formDocSnap.id, ...formDocSnap.data() } as FormSchema;
        setFormSchema(fetchedForm);
        
        const defaultValues = fetchedForm.fields.reduce((acc, field) => {
          acc[field.id] = field.type === 'checkbox' ? [] : 
                          field.type === 'rating' ? 0 : 
                          field.type === 'nps' ? undefined : // NPS can start unselected
                          '';
          return acc;
        }, {} as Record<string, any>);
        formHook.reset(defaultValues);

      } else {
        toast({ title: "Form Not Found", description: "This form may no longer exist or the link is incorrect.", variant: "destructive" });
        setFormSchema(null);
        // Optionally redirect: router.push('/some-error-page');
      }
    } catch (error) {
      console.error("Error fetching form schema:", error);
      toast({ title: "Error", description: "Could not load the form.", variant: "destructive" });
      setFormSchema(null);
    } finally {
      setIsLoadingSchema(false);
    }
  }, [formHook.reset, toast]);

  useEffect(() => {
    if (!formId) {
      setIsLoadingSchema(false);
      toast({ title: "Error", description: "Form ID is missing in URL.", variant: "destructive" });
      // Optionally redirect: router.push('/some-error-page');
      return;
    }
    loadFormSchema(formId);
  }, [formId, loadFormSchema, toast]);

  async function onSubmit(data: DynamicFormValues) {
    if (!formSchema) {
      toast({ title: "Error", description: "Form schema not loaded. Cannot submit.", variant: "destructive"});
      return;
    }
    setIsSubmitting(true);
    try {
      await saveResponseToBackend(formSchema.id, data, formSchema.isAnonymous);
      toast({
        title: "Response Submitted!",
        description: "Thank you for your feedback.",
      });
      setIsSubmitted(true);
      formHook.reset(); 
    } catch (error) {
      console.error("Error submitting response:", error);
      toast({ title: "Submission Error", description: "Could not submit your response.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingSchema) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-center">Loading Form...</CardTitle>
          </CardHeader>
          <CardContent className="text-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!formSchema) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-2xl shadow-xl text-center">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl">Form Unavailable</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">This form could not be loaded. It might have been moved or deleted.</p>
            <Button onClick={() => router.push('/')} className="mt-4">Go to Homepage</Button>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (isSubmitted) {
    return (
      <Card className="w-full shadow-xl">
        <CardHeader className="text-center">
          <Star className="mx-auto h-16 w-16 text-accent mb-4" />
          <CardTitle className="text-2xl">Thank You!</CardTitle>
          <CardDescription>Your response has been successfully submitted.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p>We appreciate you taking the time to share your thoughts.</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" onClick={() => { setIsSubmitted(false); loadFormSchema(formId); }}>Submit Another Response</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl md:text-3xl">{formSchema.title}</CardTitle>
        {formSchema.description && <CardDescription className="text-base">{formSchema.description}</CardDescription>}
      </CardHeader>
      <Form {...formHook}>
        <form onSubmit={formHook.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {formSchema.fields.map(field => (
              <FormField
                key={field.id}
                control={formHook.control}
                name={field.id as keyof DynamicFormValues}
                render={({ field: formFieldProps }) => (
                  <FormItem>
                    <FormLabel className="text-md font-semibold">{field.text} {field.required && <span className="text-destructive">*</span>}</FormLabel>
                    {field.description && <ShadcnFormDescription>{field.description}</ShadcnFormDescription>}
                    <FormControl>
                      <>
                        {field.type === "text" && <Input placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "email" && <Input type="email" placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "number" && <Input type="number" placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "textarea" && <Textarea placeholder={field.placeholder} {...formFieldProps} disabled={isSubmitting} />}
                        {field.type === "select" && (
                          <Select onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value as string | undefined} disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder={field.placeholder || "Select an option"} /></SelectTrigger>
                            <SelectContent>
                              {field.options?.map(option => (
                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === "radio" && (
                          <RadioGroup onValueChange={formFieldProps.onChange} defaultValue={formFieldProps.value as string | undefined} className="space-y-2" disabled={isSubmitting}>
                            {field.options?.map(option => (
                              <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                                <FormControl><RadioGroupItem value={option.value} /></FormControl>
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        )}
                        {field.type === "checkbox" && (
                           <div className="space-y-2">
                            {field.options?.map((option) => (
                              <FormItem key={option.value} className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={(formFieldProps.value as string[])?.includes(option.value)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = (formFieldProps.value as string[]) || [];
                                      if (checked) {
                                        formFieldProps.onChange([...currentValue, option.value]);
                                      } else {
                                        formFieldProps.onChange(currentValue.filter((v) => v !== option.value));
                                      }
                                    }}
                                    disabled={isSubmitting}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">{option.label}</FormLabel>
                              </FormItem>
                            ))}
                          </div>
                        )}
                        {field.type === "rating" && (
                           <div className="flex space-x-1">
                            {[...(Array(field.maxRating || 5).keys())].map(i => i + (field.minRating || 1)).map(starValue => (
                              <Button
                                key={starValue}
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => formFieldProps.onChange(starValue)}
                                className={(formFieldProps.value as number) >= starValue ? "text-accent" : "text-muted-foreground"}
                                disabled={isSubmitting}
                              >
                                <Star className="h-6 w-6" fill={(formFieldProps.value as number) >= starValue ? "currentColor" : "none"}/>
                              </Button>
                            ))}
                          </div>
                        )}
                        {field.type === "nps" && (
                            <div className="flex flex-wrap gap-1 items-center">
                                {[...Array(11).keys()].map(npsValue => (
                                    <Button
                                        key={npsValue}
                                        type="button"
                                        variant={(formFieldProps.value as number) === npsValue ? "default" : "outline"}
                                        size="sm"
                                        className="h-8 w-8 p-0 md:h-9 md:w-9"
                                        onClick={() => formFieldProps.onChange(npsValue)}
                                        disabled={isSubmitting}
                                    >
                                        {npsValue}
                                    </Button>
                                ))}
                            </div>
                        )}
                         {field.type === "date" && <Input type="date" {...formFieldProps} disabled={isSubmitting} />}
                      </>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
             {formSchema.isAnonymous && !formSchema.fields.some(f => f.type === 'email' || f.text.toLowerCase().includes('name')) && (
              <p className="text-sm text-muted-foreground italic mt-4">This form collects responses anonymously. Your personal information will not be recorded unless explicitly asked for in the questions above.</p>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full md:w-auto" size="lg" disabled={isSubmitting || isLoadingSchema}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : "Submit Response"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

