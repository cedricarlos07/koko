import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { apiRequestXHR } from "@/lib/api-xhr";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Play,
  Clock,
  Medal,
  Send,
  Trash2,
  AlertCircle,
  Users,
  MessageSquare,
  BarChart as BarChartIcon
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from "recharts";
import { TelegramPlayground } from "@/components/telegram/telegram-playground";

// Types
interface TelegramUser {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  messageCount: number;
  lastActivity: number;
  badge: string | null;
}

interface TelegramGroupInfo {
  id: string;
  title: string;
  memberCount: number;
  messageCount: number;
  isConnected: boolean;
  lastActivity: number;
}

interface HourlyActivity {
  hour: string;
  count: number;
}

interface TestResult {
  id: string;
  name: string;
  status: "success" | "error" | "pending" | "idle";
  message: string;
  timestamp: number;
}

export default function TelegramTestPage() {
  const queryClient = useQueryClient();
  const [groupId, setGroupId] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({
    countMembers: { id: "countMembers", name: "Compte les membres dans le groupe", status: "idle", message: "", timestamp: 0 },
    sendZoomLink: { id: "sendZoomLink", name: "Envoie d'un lien Zoom dans le groupe", status: "idle", message: "", timestamp: 0 },
    countMessages: { id: "countMessages", name: "Capte les messages et les compte", status: "idle", message: "", timestamp: 0 },
    sendReminder: { id: "sendReminder", name: "Envoie de rappel auto (programmable)", status: "idle", message: "", timestamp: 0 },
    assignBadges: { id: "assignBadges", name: "Attribution automatique de badges", status: "idle", message: "", timestamp: 0 },
    forwardMessage: { id: "forwardMessage", name: "Transfert d'un message depuis une chaîne", status: "idle", message: "", timestamp: 0 }
  });

  // Récupérer les informations du groupe Telegram
  const {
    data: groupInfo,
    isLoading: isLoadingGroupInfo,
    refetch: refetchGroupInfo
  } = useQuery<TelegramGroupInfo>({
    queryKey: ["/api/telegram/test/group-info", groupId],
    queryFn: async () => {
      if (!groupId) return null;
      const res = await apiRequest("GET", `/api/telegram/test/group-info?groupId=${groupId}`);
      return res.json();
    },
    enabled: !!groupId,
  });

  // Récupérer les utilisateurs du groupe Telegram
  const {
    data: users,
    isLoading: isLoadingUsers,
    refetch: refetchUsers
  } = useQuery<TelegramUser[]>({
    queryKey: ["/api/telegram/test/users", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await apiRequest("GET", `/api/telegram/test/users?groupId=${groupId}`);
      return res.json();
    },
    enabled: !!groupId,
  });

  // Récupérer l'activité horaire du groupe Telegram
  const {
    data: hourlyActivity,
    isLoading: isLoadingActivity,
    refetch: refetchActivity
  } = useQuery<HourlyActivity[]>({
    queryKey: ["/api/telegram/test/activity", groupId],
    queryFn: async () => {
      if (!groupId) return [];
      const res = await apiRequest("GET", `/api/telegram/test/activity?groupId=${groupId}`);
      return res.json();
    },
    enabled: !!groupId,
  });

  // Mutation pour rafraîchir les informations du groupe
  const refreshMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }
      return await apiRequestXHR("POST", `/api/telegram/test/refresh?groupId=${groupId}`);
    },
    onSuccess: () => {
      addLog("Informations du groupe rafraîchies avec succès");
      toast({
        title: "Rafraîchissement réussi",
        description: "Les informations du groupe ont été mises à jour.",
      });
      // Rafraîchir toutes les requêtes
      refetchGroupInfo();
      refetchUsers();
      refetchActivity();
    },
    onError: (error) => {
      addLog(`Erreur lors du rafraîchissement: ${error.message}`);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les informations du groupe.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour générer le classement et assigner des badges
  const generateRankingMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }
      return await apiRequestXHR("POST", `/api/telegram/test/generate-ranking?groupId=${groupId}`);
    },
    onSuccess: (data) => {
      addLog(`Classement généré avec succès. ${data.badgesAssigned} badges assignés.`);
      toast({
        title: "Classement généré",
        description: `${data.badgesAssigned} badges ont été assignés aux utilisateurs les plus actifs.`,
      });
      refetchUsers();
    },
    onError: (error) => {
      addLog(`Erreur lors de la génération du classement: ${error.message}`);
      toast({
        title: "Erreur",
        description: "Impossible de générer le classement.",
        variant: "destructive",
      });
    },
  });

  // Mutation pour nettoyer les données de test
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }
      return await apiRequestXHR("POST", `/api/telegram/test/cleanup?groupId=${groupId}`);
    },
    onSuccess: () => {
      addLog("Données de test nettoyées avec succès");
      toast({
        title: "Nettoyage réussi",
        description: "Les données de test ont été supprimées.",
      });
      // Réinitialiser les résultats des tests
      setTestResults({
        countMembers: { id: "countMembers", name: "Compte les membres dans le groupe", status: "idle", message: "", timestamp: 0 },
        sendZoomLink: { id: "sendZoomLink", name: "Envoie d'un lien Zoom dans le groupe", status: "idle", message: "", timestamp: 0 },
        countMessages: { id: "countMessages", name: "Capte les messages et les compte", status: "idle", message: "", timestamp: 0 },
        sendReminder: { id: "sendReminder", name: "Envoie de rappel auto (programmable)", status: "idle", message: "", timestamp: 0 },
        assignBadges: { id: "assignBadges", name: "Attribution automatique de badges", status: "idle", message: "", timestamp: 0 },
        forwardMessage: { id: "forwardMessage", name: "Transfert d'un message depuis une chaîne", status: "idle", message: "", timestamp: 0 }
      });
      // Vider les logs
      setLogs([]);
      // Rafraîchir toutes les requêtes
      refetchGroupInfo();
      refetchUsers();
      refetchActivity();
    },
    onError: (error) => {
      addLog(`Erreur lors du nettoyage: ${error.message}`);
      toast({
        title: "Erreur",
        description: "Impossible de nettoyer les données de test.",
        variant: "destructive",
      });
    },
  });

  // Fonction pour exécuter un test
  const runTest = async (testId: string) => {
    try {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }

      // Mettre à jour le statut du test
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          ...prev[testId],
          status: "pending",
          message: "Test en cours...",
          timestamp: Date.now()
        }
      }));

      addLog(`Exécution du test: ${testResults[testId].name}`);
      console.log(`Exécution du test ${testId} pour le groupe ${groupId}`);

      // Utiliser XMLHttpRequest au lieu de fetch
      try {
        const data = await apiRequestXHR("POST", `/api/telegram/test/run-test`, {
          testId,
          groupId
        });

        console.log(`Réponse du test ${testId}:`, data);

        // Mettre à jour le statut du test
        setTestResults(prev => ({
          ...prev,
          [testId]: {
            ...prev[testId],
            status: data.success ? "success" : "error",
            message: data.message,
            timestamp: Date.now()
          }
        }));

        addLog(`Résultat du test: ${data.message}`);

        // Rafraîchir les données si nécessaire
        if (data.success) {
          if (testId === "countMembers" || testId === "countMessages") {
            refetchGroupInfo();
            refetchUsers();
            refetchActivity();
          }
        }

        return data;
      } catch (apiError) {
        console.error(`Erreur API lors de l'exécution du test ${testId}:`, apiError);
        throw apiError;
      }
    } catch (error) {
      console.error(`Erreur lors de l'exécution du test ${testId}:`, error);

      // Mettre à jour le statut du test
      setTestResults(prev => ({
        ...prev,
        [testId]: {
          ...prev[testId],
          status: "error",
          message: error.message || "Une erreur est survenue",
          timestamp: Date.now()
        }
      }));

      addLog(`Erreur lors du test: ${error.message}`);

      throw error;
    }
  };

  // Fonction pour planifier un rappel
  const scheduleReminder = async () => {
    try {
      if (!groupId) {
        throw new Error("Veuillez entrer un ID de groupe Telegram");
      }

      // Mettre à jour le statut du test
      setTestResults(prev => ({
        ...prev,
        sendReminder: {
          ...prev.sendReminder,
          status: "pending",
          message: "Planification en cours...",
          timestamp: Date.now()
        }
      }));

      addLog("Planification d'un rappel automatique");

      // Calculer l'heure du rappel (dans 2 minutes)
      const reminderTime = new Date(Date.now() + 2 * 60 * 1000);

      // Appeler l'API pour planifier le rappel avec XMLHttpRequest
      const data = await apiRequestXHR("POST", `/api/telegram/test/schedule-reminder`, {
        groupId,
        reminderTime: reminderTime.toISOString()
      });

      // Mettre à jour le statut du test
      setTestResults(prev => ({
        ...prev,
        sendReminder: {
          ...prev.sendReminder,
          status: "success",
          message: `Rappel planifié pour ${format(reminderTime, 'HH:mm:ss')}`,
          timestamp: Date.now()
        }
      }));

      addLog(`Rappel planifié pour ${format(reminderTime, 'HH:mm:ss')}`);

      return data;
    } catch (error) {
      console.error("Erreur lors de la planification du rappel:", error);

      // Mettre à jour le statut du test
      setTestResults(prev => ({
        ...prev,
        sendReminder: {
          ...prev.sendReminder,
          status: "error",
          message: error.message || "Une erreur est survenue",
          timestamp: Date.now()
        }
      }));

      addLog(`Erreur lors de la planification: ${error.message}`);

      throw error;
    }
  };

  // Fonction pour ajouter un log
  const addLog = (message: string) => {
    const timestamp = format(new Date(), 'HH:mm:ss');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 99)]);
  };

  // Formater la date de dernière activité
  const formatLastActivity = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: fr });
  };

  // Générer des données d'activité simulées si aucune donnée n'est disponible
  const getActivityData = () => {
    if (hourlyActivity && hourlyActivity.length > 0) {
      return hourlyActivity;
    }

    // Générer des données simulées pour les dernières 24 heures
    const simulatedData = [];
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      simulatedData.push({
        hour: format(hour, 'HH:00'),
        count: Math.floor(Math.random() * 20)
      });
    }

    return simulatedData;
  };

  // Effet pour charger les informations du groupe au chargement de la page
  useEffect(() => {
    // Charger l'ID du groupe depuis le localStorage s'il existe
    const savedGroupId = localStorage.getItem("telegramTestGroupId");
    if (savedGroupId) {
      setGroupId(savedGroupId);
    }
  }, []);

  // Effet pour sauvegarder l'ID du groupe dans le localStorage
  useEffect(() => {
    if (groupId) {
      localStorage.setItem("telegramTestGroupId", groupId);
    }
  }, [groupId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Tests & Activité en temps réel</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Section 1: Connexion au Groupe Test */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FaTelegram className="mr-2 h-5 w-5 text-blue-500" />
              Connexion au Groupe Test
            </CardTitle>
            <CardDescription>
              Connectez-vous à un groupe Telegram pour tester les fonctionnalités
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">État du bot:</span>
              {isLoadingGroupInfo ? (
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              ) : groupInfo?.isConnected ? (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-500 text-sm">Connecté</span>
                </div>
              ) : (
                <div className="flex items-center">
                  <XCircle className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-red-500 text-sm">Non connecté</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="groupId" className="text-sm font-medium">
                Telegram Chat ID du groupe test
              </label>
              <div className="flex space-x-2">
                <Input
                  id="groupId"
                  placeholder="-100123456789"
                  value={groupId}
                  onChange={(e) => setGroupId(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchGroupInfo()}
                  disabled={!groupId || isLoadingGroupInfo}
                >
                  {isLoadingGroupInfo ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nombre total de membres:</span>
              <span className="font-semibold">
                {isLoadingGroupInfo ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                ) : groupInfo?.memberCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Nombre total de messages:</span>
              <span className="font-semibold">
                {isLoadingGroupInfo ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                ) : groupInfo?.messageCount || 0}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Dernière activité:</span>
              <span className="text-sm">
                {isLoadingGroupInfo ? (
                  <Loader2 className="h-4 w-4 animate-spin inline mr-1" />
                ) : groupInfo?.lastActivity ? (
                  formatLastActivity(groupInfo.lastActivity)
                ) : (
                  "Jamais"
                )}
              </span>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => refreshMutation.mutate()}
              disabled={!groupId || refreshMutation.isPending}
            >
              {refreshMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rafraîchissement...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Rafraîchir les infos
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Section 2: Activité en temps réel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Activité en temps réel (dernières 24h)</CardTitle>
            <CardDescription>
              Visualisez l'activité du groupe Telegram en temps réel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 mb-6">
              {isLoadingActivity ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={getActivityData()}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Messages"
                      stroke="#3b82f6"
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur Telegram</TableHead>
                    <TableHead className="text-right">Nombre de messages</TableHead>
                    <TableHead className="text-right">Dernière activité</TableHead>
                    <TableHead className="text-right">Badge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingUsers ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                      </TableCell>
                    </TableRow>
                  ) : users && users.length > 0 ? (
                    users.slice(0, 5).map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.username ? `@${user.username}` : `${user.firstName} ${user.lastName}`}
                        </TableCell>
                        <TableCell className="text-right">{user.messageCount}</TableCell>
                        <TableCell className="text-right">
                          {formatLastActivity(user.lastActivity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {user.badge ? (
                            <Badge variant="outline" className="ml-auto">
                              {user.badge}
                            </Badge>
                          ) : (
                            <span className="text-gray-400 text-sm">Aucun</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              className="w-full"
              onClick={() => generateRankingMutation.mutate()}
              disabled={!groupId || generateRankingMutation.isPending}
            >
              {generateRankingMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                <>
                  <Medal className="mr-2 h-4 w-4" />
                  Générer classement & assigner badges
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Section 3: Tests des fonctionnalités automatisées */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Tests des fonctionnalités automatisées</CardTitle>
            <CardDescription>
              Testez les fonctionnalités principales de l'application
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fonctionnalité</TableHead>
                    <TableHead>Test réel</TableHead>
                    <TableHead className="text-center">Statut</TableHead>
                    <TableHead className="text-right">Résultat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.values(testResults).map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="font-medium">{test.name}</TableCell>
                      <TableCell>
                        {test.id === "sendReminder" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={scheduleReminder}
                            disabled={!groupId || test.status === "pending"}
                          >
                            {test.status === "pending" ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            Planifier
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => runTest(test.id)}
                            disabled={!groupId || test.status === "pending"}
                          >
                            {test.status === "pending" ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="mr-1 h-3 w-3" />
                            )}
                            Lancer
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {test.status === "success" && <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />}
                        {test.status === "error" && <XCircle className="h-5 w-5 text-red-500 mx-auto" />}
                        {test.status === "pending" && <Loader2 className="h-5 w-5 animate-spin text-blue-500 mx-auto" />}
                        {test.status === "idle" && <span className="text-gray-400">-</span>}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {test.id === "assignBadges" && test.status === "success" ? (
                          <div className="text-left">
                            <div className="font-medium mb-1">{test.message.split(':\n\n')[0]}</div>
                            {test.message.includes(':\n\n') && (
                              <div className="text-xs bg-gray-50 p-2 rounded max-h-32 overflow-y-auto">
                                {test.message.split(':\n\n')[1].split('\n').map((line, idx) => (
                                  <div key={idx} className="mb-1">{line}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : test.message ? (
                          test.message
                        ) : (
                          <span className="text-gray-400">Pas encore testé</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => cleanupMutation.mutate()}
              disabled={!groupId || cleanupMutation.isPending}
            >
              {cleanupMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Nettoyer les données de test
            </Button>
          </CardFooter>
        </Card>

        {/* Section 4: Logs d'exécution */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertCircle className="mr-2 h-5 w-5 text-amber-500" />
              Logs d'exécution
            </CardTitle>
            <CardDescription>
              Suivez les logs des tests et des actions effectuées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900 text-gray-100 rounded-md p-4 h-[400px] overflow-y-auto font-mono text-xs">
              {logs.length > 0 ? (
                logs.map((log, index) => (
                  <div key={index} className="mb-1">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-gray-500 italic">
                  Aucun log disponible. Exécutez des tests pour voir les logs.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
