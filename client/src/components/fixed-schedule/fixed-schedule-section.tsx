import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FixedScheduleTable } from "./fixed-schedule-table";
import { FixedScheduleImport } from "./fixed-schedule-import";
import { SystemSettings } from "./system-settings";
import { AutomationLogs } from "./automation-logs";
import { Calendar, FileText, Settings } from "lucide-react";

export function FixedScheduleSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Planning Fixe</h2>
      <p className="text-gray-500">
        Gérez le planning fixe des cours, les automatisations et les paramètres système.
      </p>

      <Tabs defaultValue="schedule" className="space-y-6">
        <TabsList>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Planning</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Paramètres</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-6">
          <FixedScheduleImport />
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">Cours planifiés</h3>
            <FixedScheduleTable />
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>

        <TabsContent value="logs">
          <AutomationLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
