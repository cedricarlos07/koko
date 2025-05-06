import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api";
import { Loader2, Users, MessageSquare, Clock, BarChart3, RefreshCw } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDays, subDays, subWeeks, subMonths } from "date-fns";

// Types pour les statistiques
interface TelegramGroupStat {
  id: number;
  courseId: number;
  courseName: string;
  level: string;
  groupName: string;
  groupLink: string;
  memberCount: number;
  messageCount: number;
  lastActivity: number;
  teacherName: string;
}

interface PlatformStats {
  users: {
    total: number;
    students: number;
    professors: number;
    coaches: number;
    admins: number;
  };
  courses: {
    total: number;
  };
  telegramStats: TelegramGroupStat[];
}

export default function StatisticsPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activityPeriod, setActivityPeriod] = useState<string>("week");
  const [startDate, setStartDate] = useState<Date>(() => subWeeks(new Date(), 1));

  // Récupérer les statistiques de la plateforme
  const { data: platformStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<PlatformStats>({
    queryKey: ["/api/statistics"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/statistics");
      return res.json();
    },
  });

  // Récupérer les statistiques des groupes Telegram
  const { data: telegramStats, isLoading: isLoadingTelegram, refetch: refetchTelegram } = useQuery<TelegramGroupStat[]>({
    queryKey: ["/api/telegram/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/stats");
      return res.json();
    },
  });

  // Fonction pour rafraîchir les statistiques des groupes Telegram
  const refreshTelegramStats = async () => {
    try {
      setIsRefreshing(true);
      const res = await apiRequest("POST", "/api/telegram/refresh-stats");
      const data = await res.json();

      toast({
        title: "Statistiques rafraîchies",
        description: `${data.count} groupes Telegram ont été mis à jour.`,
      });

      // Rafraîchir les données
      refetchTelegram();
      refetchStats();
    } catch (error) {
      console.error("Erreur lors du rafraîchissement des statistiques:", error);
      toast({
        title: "Erreur",
        description: "Impossible de rafraîchir les statistiques des groupes Telegram.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fonction pour mettre à jour la période d'activité
  const handlePeriodChange = (value: string) => {
    setActivityPeriod(value);

    const now = new Date();
    let newStartDate: Date;

    switch (value) {
      case "day":
        newStartDate = subDays(now, 1);
        break;
      case "week":
        newStartDate = subWeeks(now, 1);
        break;
      case "month":
        newStartDate = subMonths(now, 1);
        break;
      case "quarter":
        newStartDate = subMonths(now, 3);
        break;
      default:
        newStartDate = subWeeks(now, 1);
    }

    setStartDate(newStartDate);
  };

  // Fonction pour calculer le pourcentage d'activité
  const calculateActivity = (messages: number, members: number) => {
    if (members === 0) return 0;

    // Ajuster les attentes en fonction de la période
    let expectedMessagesPerMember = 20; // Par défaut pour une semaine

    switch (activityPeriod) {
      case "day":
        expectedMessagesPerMember = 3;
        break;
      case "week":
        expectedMessagesPerMember = 20;
        break;
      case "month":
        expectedMessagesPerMember = 80;
        break;
      case "quarter":
        expectedMessagesPerMember = 240;
        break;
    }

    // Moyenne de messages par étudiant
    const maxExpectedMessages = members * expectedMessagesPerMember;
    const percentage = (messages / maxExpectedMessages) * 100;

    // Plafonner à 100%
    return Math.min(Math.round(percentage), 100);
  };

  // Fonction pour formater la date de dernière activité
  const formatLastActivity = (timestamp: number | null | undefined) => {
    if (!timestamp) {
      return "Aucune activité récente";
    }

    try {
      // Vérifier si le timestamp est valide
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Date invalide";
      }

      return formatDistanceToNow(date, { addSuffix: true, locale: fr });
    } catch (error) {
      console.error("Erreur lors du formatage de la date:", error);
      return "Date invalide";
    }
  };

  // Fonction pour trier les groupes par activité
  const sortByActivity = (groups: TelegramGroupStat[]) => {
    return [...groups].sort((a, b) => {
      const activityA = calculateActivity(a.messageCount, a.memberCount);
      const activityB = calculateActivity(b.messageCount, b.memberCount);
      return activityB - activityA;
    });
  };

  // Fonction pour trier les groupes par nombre de membres
  const sortByMembers = (groups: TelegramGroupStat[]) => {
    return [...groups].sort((a, b) => b.memberCount - a.memberCount);
  };

  // Fonction pour trier les groupes par nombre de messages
  const sortByMessages = (groups: TelegramGroupStat[]) => {
    return [...groups].sort((a, b) => b.messageCount - a.messageCount);
  };

  // Fonction pour trier les groupes par dernière activité
  const sortByLastActivity = (groups: TelegramGroupStat[]) => {
    return [...groups].sort((a, b) => b.lastActivity - a.lastActivity);
  };

  // Fonction pour obtenir la couleur de la barre de progression en fonction du pourcentage
  const getProgressColor = (percentage: number) => {
    if (percentage < 30) return "bg-red-500";
    if (percentage < 70) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Statistiques de la Plateforme</h1>
        <Button
          onClick={refreshTelegramStats}
          disabled={isRefreshing}
          className="flex items-center gap-2"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Rafraîchir les statistiques
        </Button>
      </div>

      {/* Statistiques générales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : platformStats?.users.total || 0}
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-gray-500">Étudiants</span>
                <span className="font-semibold">{platformStats?.users.students || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500">Coachs</span>
                <span className="font-semibold">{platformStats?.users.coaches || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {isLoadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : platformStats?.courses.total || 0}
              </div>
              <BarChart3 className="h-8 w-8 text-indigo-500" />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Cours actifs sur la plateforme
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Groupes Telegram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {isLoadingTelegram ? <Loader2 className="h-6 w-6 animate-spin" /> : telegramStats?.length || 0}
              </div>
              <FaTelegram className="h-8 w-8 text-blue-500" />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Groupes Telegram actifs
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Messages Telegram</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div className="text-2xl font-bold">
                {isLoadingTelegram ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  telegramStats?.reduce((sum, group) => sum + group.messageCount, 0) || 0
                )}
              </div>
              <MessageSquare className="h-8 w-8 text-green-500" />
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Messages échangés au total
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistiques des groupes Telegram */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">Statistiques des Groupes Telegram</h2>

          <div className="flex items-center mt-2 md:mt-0">
            <span className="text-sm text-gray-500 mr-2">Période d'analyse:</span>
            <Select value={activityPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Dernières 24 heures</SelectItem>
                <SelectItem value="week">Dernière semaine</SelectItem>
                <SelectItem value="month">Dernier mois</SelectItem>
                <SelectItem value="quarter">Dernier trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="activity">
          <TabsList className="mb-4">
            <TabsTrigger value="activity">Par activité</TabsTrigger>
            <TabsTrigger value="members">Par membres</TabsTrigger>
            <TabsTrigger value="messages">Par messages</TabsTrigger>
            <TabsTrigger value="recent">Activité récente</TabsTrigger>
          </TabsList>

          <TabsContent value="activity" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingTelegram ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : telegramStats && telegramStats.length > 0 ? (
                sortByActivity(telegramStats).map((group) => {
                  const activityPercentage = calculateActivity(group.messageCount, group.memberCount);
                  return (
                    <Card key={group.id} className="overflow-hidden">
                      <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800">{group.courseName}</h3>
                            <p className="text-sm text-gray-500">Coach: {group.teacherName}</p>
                            <div className="flex items-center mt-2">
                              <FaTelegram className="h-4 w-4 text-blue-500 mr-2" />
                              <a
                                href={group.groupLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-500 hover:underline"
                              >
                                {group.groupName}
                              </a>
                            </div>
                          </div>

                          <div className="flex flex-col md:items-end gap-2 md:w-1/3">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-sm text-gray-500">Activité:</span>
                              <span className="font-semibold">{activityPercentage}%</span>
                            </div>
                            <Progress
                              value={activityPercentage}
                              className="h-2 w-full"
                              indicatorClassName={getProgressColor(activityPercentage)}
                            />
                            <div className="flex justify-between w-full text-sm mt-1">
                              <div>
                                <Users className="h-3 w-3 inline mr-1" />
                                <span>{group.memberCount} membres</span>
                              </div>
                              <div>
                                <MessageSquare className="h-3 w-3 inline mr-1" />
                                <span>{group.messageCount} messages</span>
                              </div>
                            </div>
                            <div className="text-xs text-gray-500 mt-1 text-right">
                              Période: {activityPeriod === "day" ? "24h" :
                                        activityPeriod === "week" ? "7 jours" :
                                        activityPeriod === "month" ? "30 jours" : "90 jours"}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune donnée disponible pour les groupes Telegram.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="members" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingTelegram ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : telegramStats && telegramStats.length > 0 ? (
                sortByMembers(telegramStats).map((group) => (
                  <Card key={group.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{group.courseName}</h3>
                          <p className="text-sm text-gray-500">Coach: {group.teacherName}</p>
                          <div className="flex items-center mt-2">
                            <FaTelegram className="h-4 w-4 text-blue-500 mr-2" />
                            <a
                              href={group.groupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                            >
                              {group.groupName}
                            </a>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2 md:w-1/3">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-gray-500">Membres:</span>
                            <span className="font-semibold">{group.memberCount}</span>
                          </div>
                          <Progress
                            value={(group.memberCount / 50) * 100}
                            className="h-2 w-full"
                            indicatorClassName="bg-blue-500"
                          />
                          <div className="flex justify-between w-full text-sm mt-1">
                            <div>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              <span>{group.messageCount} messages</span>
                            </div>
                            <div>
                              <Clock className="h-3 w-3 inline mr-1" />
                              <span>{formatLastActivity(group.lastActivity)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune donnée disponible pour les groupes Telegram.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="messages" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingTelegram ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : telegramStats && telegramStats.length > 0 ? (
                sortByMessages(telegramStats).map((group) => (
                  <Card key={group.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{group.courseName}</h3>
                          <p className="text-sm text-gray-500">Coach: {group.teacherName}</p>
                          <div className="flex items-center mt-2">
                            <FaTelegram className="h-4 w-4 text-blue-500 mr-2" />
                            <a
                              href={group.groupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                            >
                              {group.groupName}
                            </a>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2 md:w-1/3">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-gray-500">Messages:</span>
                            <span className="font-semibold">{group.messageCount}</span>
                          </div>
                          <Progress
                            value={(group.messageCount / 200) * 100}
                            className="h-2 w-full"
                            indicatorClassName="bg-green-500"
                          />
                          <div className="flex justify-between w-full text-sm mt-1">
                            <div>
                              <Users className="h-3 w-3 inline mr-1" />
                              <span>{group.memberCount} membres</span>
                            </div>
                            <div>
                              <Clock className="h-3 w-3 inline mr-1" />
                              <span>{formatLastActivity(group.lastActivity)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune donnée disponible pour les groupes Telegram.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="recent" className="mt-0">
            <div className="grid grid-cols-1 gap-4">
              {isLoadingTelegram ? (
                <div className="flex justify-center items-center h-40">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : telegramStats && telegramStats.length > 0 ? (
                sortByLastActivity(telegramStats).map((group) => (
                  <Card key={group.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{group.courseName}</h3>
                          <p className="text-sm text-gray-500">Coach: {group.teacherName}</p>
                          <div className="flex items-center mt-2">
                            <FaTelegram className="h-4 w-4 text-blue-500 mr-2" />
                            <a
                              href={group.groupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-500 hover:underline"
                            >
                              {group.groupName}
                            </a>
                          </div>
                        </div>

                        <div className="flex flex-col md:items-end gap-2 md:w-1/3">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-sm text-gray-500">Dernière activité:</span>
                            <span className="font-semibold">{formatLastActivity(group.lastActivity)}</span>
                          </div>
                          <div className="flex justify-between w-full text-sm mt-3">
                            <div>
                              <Users className="h-3 w-3 inline mr-1" />
                              <span>{group.memberCount} membres</span>
                            </div>
                            <div>
                              <MessageSquare className="h-3 w-3 inline mr-1" />
                              <span>{group.messageCount} messages</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Aucune donnée disponible pour les groupes Telegram.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
