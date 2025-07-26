
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Smile, Users, Download, Filter, CheckCircle, Percent, FileTextIcon as PageBreakIcon, Image as ImageIconLucide, Loader2, Copy } from "lucide-react";
import { summarizeFeedback, SummarizeFeedbackInput } from '@/ai/flows/summarize-feedback';
import { useToast } from "@/hooks/use-toast";
import type { FormSchema, FormResponse, QuestionSchema, FormFieldOption } from "@/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, BarChart, PieChart } from 'recharts';
import { Progress } from '@/components/ui/progress';
import { CSVLink } from 'react-csv';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, collection, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { useParams } from 'next/navigation';
import Link from "next/link"; // Added import

const ratingChartConfig = {
  satisfaction: { label: "Satisfaction", color: "hsl(var(--chart-1))" },
  recommendation: { label: "Recommendation", color: "hsl(var(--chart-2))" },
} satisfies Record<string, any>;

// Mock data for sentiment - will remain mock until AI flow provides structured sentiment
const mockSentimentData = [
  { name: 'Positive', value: 70, fill: 'hsl(var(--chart-4))' },
  { name: 'Neutral', value: 20, fill: 'hsl(var(--chart-2))' },
  { name: 'Negative', value: 10, fill: 'hsl(var(--chart-5))' },
];

export default function FormResultsPage() {
  const params = useParams();
  const { formId: formIdFromParams } = params; // Destructure and rename for clarity
  const formId = typeof formIdFromParams === 'string' ? formIdFromParams : Array.isArray(formIdFromParams) ? formIdFromParams[0] : '';

  const { toast } = useToast();
  const [form, setForm] = useState<FormSchema | null>(null);
  const [responses, setResponses] = useState<FormResponse[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingDistribution, setRatingDistribution] = useState<any[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [sentimentData, setSentimentData] = useState(mockSentimentData);


  const getAnswerDisplayValue = useCallback((field: QuestionSchema, answer: any): string => {
    if (answer === null || typeof answer === 'undefined' || answer === '') return 'N/A';
    
    if (Array.isArray(answer)) { // For checkbox type
      if (field.options && field.options.length > 0) {
        return answer.map(val => field.options?.find(opt => opt.value === val)?.label || val).join(', ');
      }
      return answer.join(', ');
    }

    if (field.options && field.options.length > 0 && (typeof answer === 'string' || typeof answer === 'number')) {
      const selectedOption = field.options.find(opt => opt.value === String(answer));
      return selectedOption ? selectedOption.label : String(answer);
    }
    
    if (field.type === 'rating' && typeof answer === 'number') {
        return `${answer} Star${answer > 1 ? 's' : ''}`;
    }
    
    if (field.type === 'nps' && typeof answer === 'number') {
        return `${answer} / 10`;
    }

    if (field.type === 'date' && typeof answer === 'string') {
      // Attempt to format date if it's a valid date string, otherwise return as is
      try {
        const date = new Date(answer);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      } catch (e) { /* ignore, return raw string */ }
    }

    return String(answer);
  }, []);

  const calculateRatingDistribution = useCallback((fetchedResponses: FormResponse[], currentForm: FormSchema | null) => {
    if (!currentForm || !currentForm.fields || fetchedResponses.length === 0) {
      setRatingDistribution([]);
      return;
    }
    // Prioritize 'rating' type, then 'nps' if no 'rating' type
    const ratingQuestion = currentForm.fields.find(f => f.type === 'rating') || currentForm.fields.find(f => f.type === 'nps');
    
    if (ratingQuestion) {
      const counts: Record<string, number> = {}; // Use string for rating key to handle NPS (0-10) and Rating (1-5)
      const maxScale = ratingQuestion.type === 'nps' ? 10 : (ratingQuestion.maxRating || 5);
      const minScale = ratingQuestion.type === 'nps' ? 0 : (ratingQuestion.minRating || 1);

      fetchedResponses.forEach(r => {
        const answer = r.answers[ratingQuestion.id];
        if (typeof answer === 'number' && !isNaN(answer)) {
          const rating = Math.round(answer);
          // Ensure rating is within expected scale
          if (rating >= minScale && rating <= maxScale) {
             const ratingKey = ratingQuestion.type === 'nps' ? `${rating}` : `⭐ ${rating}`;
             counts[ratingKey] = (counts[ratingKey] || 0) + 1;
          }
        }
      });

      // Create data for all possible ratings in the scale, even if count is 0
      const distData = [];
      for (let i = minScale; i <= maxScale; i++) {
          const ratingKey = ratingQuestion.type === 'nps' ? `${i}` : `⭐ ${i}`;
          distData.push({
              rating: ratingKey,
              count: counts[ratingKey] || 0,
          });
      }
      
      // Sort if it's star rating, NPS is already in order
      if (ratingQuestion.type !== 'nps') {
        distData.sort((a, b) => parseInt(a.rating.replace('⭐ ', '')) - parseInt(b.rating.replace('⭐ ', '')));
      }

      setRatingDistribution(distData);
    } else {
      setRatingDistribution([]);
    }
  }, []);


  const prepareCsvData = useCallback((currentForm: FormSchema | null, fetchedResponses: FormResponse[]) => {
    if (currentForm && currentForm.fields && fetchedResponses.length > 0) {
      const headers = currentForm.fields
        .filter(field => field.type !== 'pagebreak')
        .map(field => ({ label: field.text, key: field.id }));
      headers.unshift({ label: "Response ID", key: "id" });
      headers.push({ label: "Submitted At", key: "timestamp" });

      const dataForCsv = fetchedResponses.map(res => {
        const row: any = { id: res.id.substring(0, 8), timestamp: new Date(res.timestamp).toLocaleString() };
        currentForm.fields
          .filter(field => field.type !== 'pagebreak')
          .forEach(field => {
            row[field.id] = getAnswerDisplayValue(field, res.answers[field.id]);
          });
        return row;
      });
      setCsvData([{ headers, data: dataForCsv }]);
    } else {
      setCsvData([]);
    }
  }, [getAnswerDisplayValue]);

  useEffect(() => {
    if (!formId) {
      setIsLoading(false);
      toast({ title: "Error", description: "Form ID is missing. Cannot load results.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    let currentFormCache: FormSchema | null = null;

    const formDocRef = doc(db, "surveys", formId);
    const unsubscribeForm = onSnapshot(formDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const formData = docSnap.data();
        const createdAt = formData.createdAt instanceof Timestamp ? formData.createdAt.toDate().toISOString() : formData.createdAt as string;
        const updatedAt = formData.updatedAt instanceof Timestamp ? formData.updatedAt.toDate().toISOString() : formData.updatedAt as string;
        
        currentFormCache = {
          id: docSnap.id,
          ...formData,
          createdAt: createdAt,
          updatedAt: updatedAt,
          fields: formData.fields || []
        } as FormSchema;
        setForm(currentFormCache);
      } else {
        toast({ title: "Error", description: "Form not found.", variant: "destructive" });
        setForm(null);
        currentFormCache = null;
      }
      // Recalculate based on current responses state if form changes
      if (responses.length > 0 && currentFormCache) {
        calculateRatingDistribution(responses, currentFormCache);
        prepareCsvData(currentFormCache, responses);
      }
      // If responses haven't loaded yet, but form has, don't stop loading
      // Stop loading only if responses are also processed or form not found
      if ((responses.length > 0 && currentFormCache) || !docSnap.exists()) {
        setIsLoading(false); 
      }
    }, (error) => {
      console.error("Error fetching form details:", error);
      toast({ title: "Error", description: "Could not fetch form details.", variant: "destructive" });
      setForm(null);
      currentFormCache = null;
      setIsLoading(false);
    });

    const responsesQuery = query(collection(db, "responses"), where("formId", "==", formId), orderBy("timestamp", "desc"));
    const unsubscribeResponses = onSnapshot(responsesQuery, (querySnapshot) => {
      const fetchedResponses: FormResponse[] = [];
      querySnapshot.forEach((docSnap) => {
        const responseData = docSnap.data();
        const timestamp = responseData.timestamp instanceof Timestamp ? responseData.timestamp.toDate().toISOString() : responseData.timestamp as string;
        fetchedResponses.push({ 
            id: docSnap.id, 
            ...responseData,
            timestamp: timestamp,
            answers: responseData.answers || {}
        } as FormResponse);
      });
      setResponses(fetchedResponses);
      
      if (currentFormCache) { 
        calculateRatingDistribution(fetchedResponses, currentFormCache);
        prepareCsvData(currentFormCache, fetchedResponses);
      }
      setIsLoading(false); 

    }, (error) => {
      console.error("Error fetching responses:", error);
      toast({ title: "Error", description: "Could not fetch responses.", variant: "destructive" });
      setIsLoading(false);
    });

    return () => {
      unsubscribeForm();
      unsubscribeResponses();
    };
  }, [formId, toast, calculateRatingDistribution, prepareCsvData]); // Added formId and toast to dependencies


  const handleSummarizeFeedback = async () => {
    if (!form || !form.fields) {
      toast({ title: "Form Not Loaded", description: "Form data is not available to identify text fields.", variant: "destructive" });
      return;
    }
    if (!responses.length) {
      toast({ title: "No Responses", description: "There are no feedback responses to summarize.", variant: "default" });
      setSummary("No responses available to summarize.");
      return;
    }

    setIsSummarizing(true);
    setSummary(null); 

    try {
      const textFieldsIds = form.fields
        .filter(f => (f.type === 'textarea' || f.type === 'text') && f.type !== 'pagebreak')
        .map(f => f.id);

      if (textFieldsIds.length === 0) {
        toast({ title: "No Text Fields", description: "This form does not contain any text or textarea fields to summarize.", variant: "default" });
        setSummary("No text-based questions found in this form to summarize.");
        setIsSummarizing(false);
        return;
      }

      const feedbackTexts = responses.flatMap(r => 
        textFieldsIds.map(fieldId => {
          const answer = r.answers[fieldId];
          return typeof answer === 'string' && answer.trim() !== '' ? answer.trim() : null;
        })
      ).filter(text => text !== null) as string[];

      if (feedbackTexts.length === 0) {
        toast({ title: "No Text Feedback", description: "No textual feedback provided by users for the text fields.", variant: "default" });
        setSummary("No textual feedback provided by users for summarization.");
        setIsSummarizing(false);
        return;
      }

      const input: SummarizeFeedbackInput = { feedbackResponses: feedbackTexts };
      const result = await summarizeFeedback(input);
      setSummary(result.summary);
      toast({ title: "Success", description: "Feedback summarized by AI." });
    } catch (error: any) {
      console.error("AI Summary Error:", error);
      let errorMsg = "Failed to summarize feedback.";
      if (error.message) {
        errorMsg += ` Details: ${error.message}`;
      }
      toast({ title: "Summarization Error", description: errorMsg, variant: "destructive" });
      setSummary("Could not generate summary due to an error.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleExportPDF = () => {
    const chartsElement = document.getElementById('charts-section-to-export');
    if (chartsElement) {
      toast({ title: "Generating PDF...", description: "Please wait while the PDF is being prepared." });
      html2canvas(chartsElement, { scale: 2, backgroundColor: null }).then(canvas => { 
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgProps = pdf.getImageProperties(imgData);
        const ratio = imgProps.width / imgProps.height;
        
        let newCanvasWidth = pdfWidth - 20; 
        let newCanvasHeight = newCanvasWidth / ratio;

        if (newCanvasHeight > pdfHeight - 30) { 
            newCanvasHeight = pdfHeight - 30;
            newCanvasWidth = newCanvasHeight * ratio;
        }
        const xOffset = (pdfWidth - newCanvasWidth) / 2;
        const yOffset = 10; 

        pdf.setFontSize(16);
        pdf.text(form?.title || "Form Results", pdfWidth / 2, yOffset, { align: 'center' });
        pdf.addImage(imgData, 'PNG', xOffset, yOffset + 10, newCanvasWidth, newCanvasHeight);
        pdf.save(`${form?.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'form'}-results-charts.pdf`);
        toast({ title: "PDF Exported!", description: "Charts have been exported to PDF." });
      }).catch(err => {
        toast({ title: "PDF Export Error", description: "Could not export charts to PDF.", variant: "destructive" });
        console.error("PDF Export Error:", err);
      });
    } else {
      toast({ title: "Export Error", description: "Could not find charts section to export.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 items-center justify-center h-[calc(100vh-150px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading form results...</p>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-150px)]">
        <Card className="w-full max-w-md text-center p-8">
          <CardTitle className="text-2xl">Form Not Found</CardTitle>
          <CardDescription>The requested form could not be loaded or does not exist.</CardDescription>
          <Button asChild className="mt-4">
            <Link href="/forms">Go to Forms</Link>
          </Button>
        </Card>
      </div>
    );
  }

  const totalResponses = responses.length;
  const ratingQuestionDetails = form.fields.find(f => f.type === 'rating'); 
  const npsQuestionDetails = form.fields.find(f => f.type === 'nps');

  const averageRating = ratingQuestionDetails && totalResponses > 0 
    ? responses.reduce((acc, r) => {
        const answer = r.answers[ratingQuestionDetails.id];
        return acc + (typeof answer === 'number' && !isNaN(answer) ? answer : 0);
      }, 0) / totalResponses 
    : 0;
  
  const averageNPS = npsQuestionDetails && totalResponses > 0
    ? responses.reduce((acc, r) => {
        const answer = r.answers[npsQuestionDetails.id];
        return acc + (typeof answer === 'number' && !isNaN(answer) ? answer : 0);
      }, 0) / totalResponses
    : 0;


  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{form.title} - Results</h1>
          <p className="text-muted-foreground">{form.description || "Detailed analytics and responses for your form."}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {csvData.length > 0 && csvData[0].data.length > 0 ? (
            <CSVLink
                data={csvData[0].data}
                headers={csvData[0].headers}
                filename={`${form.title?.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'form'}-responses.csv`}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                target="_blank"
            >
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </CSVLink>
          ) : (
            <Button variant="outline" disabled><Download className="mr-2 h-4 w-4" /> Export CSV (No Data)</Button>
          )}
          <Button onClick={handleExportPDF} variant="outline"><ImageIconLucide className="mr-2 h-4 w-4" /> Export Charts PDF</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Responses</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalResponses}</div>
            <p className="text-xs text-muted-foreground">collected so far</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Rating</CardTitle>
            <Smile className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
                {ratingQuestionDetails ? `${averageRating.toFixed(1)} / ${ratingQuestionDetails.maxRating || 5}` : 'N/A'}
            </div>
             <Progress value={ratingQuestionDetails?.maxRating ? (averageRating / ratingQuestionDetails.maxRating) * 100 : 0} className="h-2 mt-1" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. NPS</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold">
                {npsQuestionDetails ? `${averageNPS.toFixed(1)} / 10` : 'N/A'}
            </div>
            <Progress value={npsQuestionDetails ? (averageNPS / 10) * 100 : 0} className="h-2 mt-1" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">N/A%</div> {/* Placeholder - Requires tracking form views vs submissions */}
            <p className="text-xs text-muted-foreground">of viewed forms completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="summary">Summary & AI Insights</TabsTrigger>
          <TabsTrigger value="responses">Individual Responses</TabsTrigger>
          <TabsTrigger value="charts">Charts & Visualizations</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Feedback Summary</CardTitle>
              <CardDescription>Key themes and sentiments identified by AI from textual feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isSummarizing && <div className="flex items-center space-x-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /> <p>Generating summary from responses...</p></div>}
              {!isSummarizing && summary && (
                <div className="prose dark:prose-invert max-w-none p-4 bg-muted/20 rounded-md whitespace-pre-wrap text-sm">
                  {summary}
                </div>
              )}
               {!isSummarizing && !summary && (
                <p className="text-muted-foreground">Click the button to generate an AI summary of the textual feedback from responses.</p>
              )}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSummarizeFeedback} disabled={isSummarizing || responses.length === 0}>
                {isSummarizing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Summarizing...</> : "Generate AI Summary"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="responses" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Individual Responses ({responses.length})</CardTitle>
              <CardDescription>Browse through each submitted response. Answers are displayed as submitted, with labels for choice-based questions.</CardDescription>
            </CardHeader>
            <CardContent>
              {responses.length > 0 && form && form.fields ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Response ID</TableHead>
                      {form.fields
                        .filter(field => field.type !== 'pagebreak') 
                        .map(field => (
                          <TableHead key={field.id}>{field.text}</TableHead>
                      ))}
                      <TableHead className="text-right w-[150px]">Submitted At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell className="font-medium text-xs text-muted-foreground hover:text-foreground transition-colors">
                           <button onClick={() => {navigator.clipboard.writeText(response.id); toast({title: "Copied!", description: "Response ID copied."})}} title="Copy Response ID">
                            {response.id.substring(0,8)}... <Copy className="inline h-3 w-3 ml-1" />
                           </button>
                        </TableCell>
                        {form.fields
                          .filter(field => field.type !== 'pagebreak')
                          .map(field => (
                            <TableCell key={field.id} className="text-sm">
                              {getAnswerDisplayValue(field, response.answers[field.id])}
                            </TableCell>
                        ))}
                        <TableCell className="text-right text-xs text-muted-foreground">{new Date(response.timestamp).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-10">No responses submitted yet for this form.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="mt-6" id="charts-section-to-export">
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card>
                  <CardHeader>
                      <CardTitle>Overall Rating Distribution</CardTitle>
                       <CardDescription>
                        {ratingQuestionDetails || npsQuestionDetails ? `Based on question: "${(ratingQuestionDetails || npsQuestionDetails)?.text}"` : "Rating/NPS question not found or no responses."}
                       </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {ratingDistribution.length > 0 ? (
                      <ChartContainer config={ratingChartConfig} className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={ratingDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="rating" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} width={30} />
                            <RechartsTooltip 
                                content={<ChartTooltipContent />} 
                                cursor={{fill: 'hsl(var(--muted)/0.5)'}}
                            />
                            <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </ChartContainer>
                    ) : <p className="text-muted-foreground text-center py-10">Not enough data or rating/NPS question not configured for this chart.</p>}
                  </CardContent>
              </Card>
              <Card>
                  <CardHeader>
                      <CardTitle>Sentiment Analysis (Mock Data)</CardTitle>
                      <CardDescription>This is a placeholder chart. Dynamic sentiment requires AI processing per response.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={{}} className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <RechartsTooltip 
                                content={<ChartTooltipContent nameKey="name" />} 
                                />
                              <Pie data={sentimentData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                                  {sentimentData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.fill} />
                                  ))}
                              </Pie>
                              <RechartsLegend content={<ChartLegendContent />} />
                          </PieChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </CardContent>
              </Card>
              {/* Add more charts here as needed */}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
