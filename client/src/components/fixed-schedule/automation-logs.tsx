import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare, Video } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Interface pour les logs d'automatisation
interface AutomationLog {
  id: number;
  type: string;
  status: string;
  message: string;
  details?: string;
  fixedScheduleId?: number;
  createdAt: number;
}

export function AutomationLogs() {
  const [activeTab, setActiveTab] = useState("all");

  // Récupérer tous les logs
  const { data: logs, isLoading } = useQuery<AutomationLog[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/logs");
      return res.json();
    },
  });

  // Fonction pour formater la date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Fonction pour obtenir la couleur du badge en fonction du statut
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "simulated":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Fonction pour obtenir l'icône en fonction du type
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "zoom_creation":
        return <Video className="h-4 w-4" />;
      case "telegram_message":
        return <MessageSquare className="h-4 w-4" />;
      case "reminder":
        return <FileText className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Filtrer les logs en fonction de l'onglet actif
  const filteredLogs = logs
    ? activeTab === "all"
      ? logs
      : logs.filter((log) => log.type === activeTab)
    : [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Logs d'automatisation</CardTitle>
          <CardDescription>Historique des actions d'automatisation</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full mb-2" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logs d'automatisation</CardTitle>
        <CardDescription>Historique des actions d'automatisation</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">Tous</TabsTrigger>
            <TabsTrigger value="zoom_creation">Zoom</TabsTrigger>
            <TabsTrigger value="telegram_message">Telegram</TabsTrigger>
            <TabsTrigger value="reminder">Rappels</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getTypeIcon(log.type)}
                            <span className="ml-2">
                              {log.type === "zoom_creation"
                                ? "Création Zoom"
                                : log.type === "telegram_message"
                                ? "Message Telegram"
                                : log.type === "reminder"
                                ? "Rappel"
                                : log.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeColor(log.status)}
                          >
                            {log.status === "success"
                              ? "Succès"
                              : log.status === "error"
                              ? "Erreur"
                              : log.status === "simulated"
                              ? "Simulé"
                              : log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md truncate">
                          {log.message}
                        </TableCell>
                        <TableCell>{formatDate(log.createdAt)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                        Aucun log d'automatisation trouvé.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
