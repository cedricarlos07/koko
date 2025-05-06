import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  Settings,
  Video,
  Zap,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

export function AutomationPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Récupérer les logs d'automatisation
  const { data: logs, isLoading: isLoadingLogs } = useQuery<AutomationLog[]>({
    queryKey: ["/api/logs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/logs");
      return res.json();
    },
  });

  // Mutation pour réinitialiser le planificateur
  const resetSchedulerMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Planificateur réinitialisé",
        description: "Le planificateur a été réinitialisé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la réinitialisation du planificateur: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour exécuter manuellement l'importation
  const runImportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/import");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Importation exécutée",
        description: "L'importation des cours a été exécutée avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'importation des cours: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour exécuter manuellement l'envoi des rappels
  const runRemindersMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/scheduler/reminders");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/logs"] });
      toast({
        title: "Rappels envoyés",
        description: "Les rappels de cours ont été envoyés avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'envoi des rappels: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour formater la date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  // Fonction pour obtenir l'icône en fonction du type de log
  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case "excel_import":
      case "excel_import_scheduled":
      case "excel_import_manual":
        return <FileText className="h-4 w-4" />;
      case "zoom_creation":
        return <Video className="h-4 w-4" />;
      case "telegram_message":
      case "telegram_reminders_scheduled":
      case "telegram_reminders_manual":
        return <MessageSquare className="h-4 w-4" />;
      case "scheduler_initialization":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Fonction pour obtenir le libellé en fonction du type de log
  const getLogTypeLabel = (type: string) => {
    switch (type) {
      case "excel_import":
        return "Import Excel";
      case "excel_import_scheduled":
        return "Import Excel (planifié)";
      case "excel_import_manual":
        return "Import Excel (manuel)";
      case "zoom_creation":
        return "Création Zoom";
      case "telegram_message":
        return "Message Telegram";
      case "telegram_reminders_scheduled":
        return "Rappels Telegram (planifiés)";
      case "telegram_reminders_manual":
        return "Rappels Telegram (manuels)";
      case "scheduler_initialization":
        return "Initialisation du planificateur";
      default:
        return type;
    }
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

  // Fonction pour obtenir l'icône en fonction du statut
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case "simulated":
        return <Settings className="h-4 w-4 text-blue-600" />;
      default:
        return null;
    }
  };

  // Filtrer les logs en fonction de l'onglet actif
  const filteredLogs = logs
    ? activeTab === "overview"
      ? logs.slice(0, 10)
      : activeTab === "import"
      ? logs.filter((log) => log.type.includes("excel_import"))
      : activeTab === "telegram"
      ? logs.filter((log) => log.type.includes("telegram"))
      : activeTab === "zoom"
      ? logs.filter((log) => log.type.includes("zoom"))
      : logs
    : [];

  // Statistiques des logs
  const logStats = logs
    ? {
        total: logs.length,
        success: logs.filter((log) => log.status === "success").length,
        error: logs.filter((log) => log.status === "error").length,
        simulated: logs.filter((log) => log.status === "simulated").length,
      }
    : { total: 0, success: 0, error: 0, simulated: 0 };

  if (isLoadingLogs) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Automatisations
          </h2>
          <p className="text-gray-500">
            Gérez les automatisations du système et consultez les logs d'exécution
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => resetSchedulerMutation.mutate()}
            disabled={resetSchedulerMutation.isPending}
          >
            {resetSchedulerMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Réinitialiser le planificateur
          </Button>
          <Button
            variant="outline"
            onClick={() => runImportMutation.mutate()}
            disabled={runImportMutation.isPending}
          >
            {runImportMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Importer les cours
          </Button>
          <Button
            variant="outline"
            onClick={() => runRemindersMutation.mutate()}
            disabled={runRemindersMutation.isPending}
          >
            {runRemindersMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Envoyer les rappels
          </Button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total des logs</p>
                <h3 className="text-2xl font-bold">{logStats.total}</h3>
              </div>
              <div className="bg-gray-50 p-3 rounded-full">
                <FileText className="h-6 w-6 text-gray-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Succès</p>
                <h3 className="text-2xl font-bold">{logStats.success}</h3>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Erreurs</p>
                <h3 className="text-2xl font-bold">{logStats.error}</h3>
              </div>
              <div className="bg-red-50 p-3 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Simulés</p>
                <h3 className="text-2xl font-bold">{logStats.simulated}</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Settings className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Planification des tâches
          </CardTitle>
          <CardDescription>
            Les tâches automatiques suivantes sont planifiées dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Importation des cours</h3>
                <p className="text-sm text-gray-500">
                  Chaque dimanche à 01h00 GMT, le système importe automatiquement les cours à venir depuis le fichier Excel.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <Send className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Envoi des rappels de cours</h3>
                <p className="text-sm text-gray-500">
                  Chaque jour à 06h00 GMT, le système envoie automatiquement des rappels pour les cours du jour dans les groupes Telegram correspondants.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs d'automatisation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Logs d'automatisation
          </CardTitle>
          <CardDescription>
            Historique des actions d'automatisation exécutées par le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="overview">Aperçu</TabsTrigger>
              <TabsTrigger value="import">Import Excel</TabsTrigger>
              <TabsTrigger value="telegram">Telegram</TabsTrigger>
              <TabsTrigger value="zoom">Zoom</TabsTrigger>
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
                              {getLogTypeIcon(log.type)}
                              <span className="ml-2">{getLogTypeLabel(log.type)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadgeColor(log.status)}
                            >
                              <div className="flex items-center gap-1">
                                {getStatusIcon(log.status)}
                                <span>
                                  {log.status === "success"
                                    ? "Succès"
                                    : log.status === "error"
                                    ? "Erreur"
                                    : log.status === "simulated"
                                    ? "Simulé"
                                    : log.status}
                                </span>
                              </div>
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
    </div>
  );
}
