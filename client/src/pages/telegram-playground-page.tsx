import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Users,
  MessageSquare,
  BarChart as BarChartIcon
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { TelegramPlayground } from "@/components/telegram/telegram-playground";

// Types
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

export default function TelegramPlaygroundPage() {
  const [groupId, setGroupId] = useState("");

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
      const res = await apiRequest("POST", `/api/telegram/test/refresh?groupId=${groupId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Rafraîchissement réussi",
        description: "Les informations du groupe ont été mises à jour.",
      });
      // Rafraîchir toutes les requêtes
      refetchGroupInfo();
      refetchActivity();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les informations du groupe.",
        variant: "destructive",
      });
    },
  });

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

  // Effet pour charger l'ID du groupe au chargement de la page
  useEffect(() => {
    // Charger l'ID du groupe depuis le localStorage s'il existe
    const savedGroupId = localStorage.getItem("telegramPlaygroundGroupId");
    if (savedGroupId) {
      setGroupId(savedGroupId);
    }
  }, []);

  // Effet pour sauvegarder l'ID du groupe dans le localStorage
  useEffect(() => {
    if (groupId) {
      localStorage.setItem("telegramPlaygroundGroupId", groupId);
    }
  }, [groupId]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Playground Telegram Complet</h1>
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
              Connectez-vous à un groupe Telegram pour tester toutes les fonctionnalités
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
          </CardContent>
        </Card>

        {/* Section 2: Activité du Groupe */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChartIcon className="mr-2 h-5 w-5 text-blue-500" />
              Activité du Groupe
            </CardTitle>
            <CardDescription>
              Graphique d'activité horaire du groupe Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingActivity ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getActivityData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Messages" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Section 3: Playground Telegram */}
      <TelegramPlayground 
        groupId={groupId}
        onGroupIdChange={setGroupId}
        isConnected={!!groupInfo?.isConnected}
        isLoading={isLoadingGroupInfo}
        onRefresh={() => {
          refetchGroupInfo();
          refetchActivity();
        }}
      />
    </div>
  );
}
