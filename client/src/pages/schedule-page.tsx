import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Calendar, CheckCircle, CalendarDays, ListTodo } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FixedScheduleSection } from '@/components/fixed-schedule/fixed-schedule-section';
import { DynamicScheduleView } from '@/components/schedule/dynamic-schedule-view';

export default function SchedulePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [importStatus, setImportStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [importCount, setImportCount] = useState(0);

  const isAdmin = user?.role === 'admin';

  const importMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/import-sessions');
      return await res.json();
    },
    onSuccess: (data) => {
      setImportStatus('success');
      setImportCount(data.imported);
      toast({
        title: 'Import successful',
        description: `Successfully imported ${data.imported} sessions from CSV file.`,
      });
    },
    onError: (error: Error) => {
      setImportStatus('error');
      toast({
        title: 'Import failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleImport = () => {
    setImportStatus('pending');
    importMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Schedule Management" />

        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-6 w-6" />
                  Planning des Cours
                </h1>
              </div>

              <Tabs defaultValue="dynamic-schedule" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="dynamic-schedule" className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Planning Dynamique</span>
                  </TabsTrigger>
                  <TabsTrigger value="fixed-schedule" className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4" />
                    <span>Planning Fixe</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="dynamic-schedule" className="space-y-6">
                  <DynamicScheduleView />
                </TabsContent>

                <TabsContent value="fixed-schedule" className="space-y-6">
                  <FixedScheduleSection />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}