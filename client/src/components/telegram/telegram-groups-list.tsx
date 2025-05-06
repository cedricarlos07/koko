import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Award,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
} from "lucide-react";
import { TelegramBadges } from "./telegram-badges";
import { FaTelegram } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";

// Interface pour les groupes Telegram
interface TelegramGroup {
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

export function TelegramGroupsList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [teacherFilter, setTeacherFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");

  // Récupérer les groupes Telegram
  const { data: telegramGroups, isLoading: isLoadingGroups, refetch: refetchGroups } = useQuery<TelegramGroup[]>({
    queryKey: ["/api/telegram/groups"],
    queryFn: async () => {
      console.log('Récupération des groupes Telegram...');
      const res = await apiRequest("GET", "/api/telegram/groups");
      const data = await res.json();
      console.log(`Nombre de groupes Telegram récupérés: ${data.length}`);
      return data;
    },
  });

  // Mutation pour rafraîchir les statistiques
  const refreshStatsMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/refresh-stats");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/groups"] });
      toast({
        title: "Statistiques rafraîchies",
        description: "Les statistiques des groupes Telegram ont été mises à jour.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors du rafraîchissement des statistiques: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour calculer le niveau d'activité
  const calculateActivity = (messageCount: number, memberCount: number) => {
    if (memberCount === 0) return 0;
    // Calculer un score d'activité basé sur le nombre de messages par membre
    const messagesPerMember = messageCount / memberCount;
    // Limiter à 100%
    return Math.min(Math.round(messagesPerMember * 10), 100);
  };

  // Extraire les coachs uniques pour le filtre
  const uniqueTeachers = useMemo(() => {
    if (!telegramGroups) return [];

    const teachers = new Set<string>();
    telegramGroups.forEach(group => {
      if (group.teacherName) {
        teachers.add(group.teacherName);
      }
    });

    // Éliminer les doublons en normalisant les noms (minuscules, sans espaces supplémentaires)
    const normalizedTeachers = Array.from(teachers)
      .map(name => name.trim())
      .filter((name, index, self) =>
        self.findIndex(n => n.toLowerCase() === name.toLowerCase()) === index
      );

    return normalizedTeachers.sort();
  }, [telegramGroups]);

  // Filtrer les groupes Telegram
  const filteredGroups = useMemo(() => {
    if (!telegramGroups) return [];

    return telegramGroups.filter(group => {
      // Filtre de recherche
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        group.courseName.toLowerCase().includes(searchLower) ||
        group.groupName.toLowerCase().includes(searchLower) ||
        (group.teacherName && group.teacherName.toLowerCase().includes(searchLower));

      // Filtre par enseignant
      const matchesTeacher = teacherFilter === "all" || group.teacherName === teacherFilter;

      // Filtre par niveau
      const matchesLevel = levelFilter === "all" || group.level === levelFilter;

      return matchesSearch && matchesTeacher && matchesLevel;
    });
  }, [telegramGroups, searchTerm, teacherFilter, levelFilter]);

  // Fonction pour obtenir la couleur du badge en fonction du niveau
  const getLevelBadgeColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "bbg":
        return "bg-blue-100 text-blue-800";
      case "abg":
        return "bg-green-100 text-green-800";
      case "ig":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoadingGroups) {
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
            <FaTelegram className="h-6 w-6" />
            Groupes Telegram
          </h2>
          <p className="text-gray-500">
            Gérez et suivez l'activité des groupes Telegram liés aux cours
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refreshStatsMutation.mutate()}
          disabled={refreshStatsMutation.isPending}
        >
          {refreshStatsMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Rafraîchir les statistiques
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtres
          </CardTitle>
          <CardDescription>
            Filtrez les groupes Telegram par nom, coach ou niveau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Recherche</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="search"
                  placeholder="Rechercher un cours ou un groupe"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="teacher-filter">Coach</Label>
              <Select value={teacherFilter} onValueChange={setTeacherFilter}>
                <SelectTrigger id="teacher-filter">
                  <SelectValue placeholder="Tous les coachs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les coachs</SelectItem>
                  {uniqueTeachers.map((teacher) => (
                    <SelectItem key={teacher} value={teacher}>
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="level-filter">Niveau</Label>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger id="level-filter">
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  <SelectItem value="bbg">BBG</SelectItem>
                  <SelectItem value="abg">ABG</SelectItem>
                  <SelectItem value="ig">IG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Liste des groupes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length > 0 ? (
          filteredGroups.map((group) => (
            <Card key={group.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={getLevelBadgeColor(group.level)}
                  >
                    {group.level.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{group.memberCount}</span>
                  </Badge>
                </div>
                <CardTitle className="mt-2">{group.courseName}</CardTitle>
                <CardDescription>
                  {group.teacherName ? `Coach: ${group.teacherName}` : "Pas de coach assigné"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FaTelegram className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">
                      {group.groupName.startsWith('-')
                        ? `Groupe ${group.groupName.substring(0, 6)}...`
                        : group.groupName}
                    </span>
                  </div>
                  {group.groupName.startsWith('-') && (
                    <div className="text-xs text-gray-500 mt-1">
                      ID complet: {group.groupName}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Messages</span>
                    <Badge variant="secondary">{group.messageCount}</Badge>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Activité</span>
                      <span>{calculateActivity(group.messageCount, group.memberCount)}%</span>
                    </div>
                    <Progress value={calculateActivity(group.messageCount, group.memberCount)} className="h-2" />
                  </div>

                  <div className="flex justify-end mt-4 gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={group.groupLink} target="_blank" rel="noopener noreferrer">
                        <FaTelegram className="mr-2 h-4 w-4" />
                        Ouvrir le groupe
                      </a>
                    </Button>
                    <Button size="sm">
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer un message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full border border-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
            <FaTelegram className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun groupe Telegram trouvé</h3>
            <p className="text-gray-500 mb-4">
              {telegramGroups && telegramGroups.length > 0
                ? "Aucun groupe ne correspond aux filtres sélectionnés."
                : "Vous n'avez pas encore connecté de cours à des groupes Telegram."}
            </p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" asChild>
                <a href="/courses">
                  Gérer les cours
                </a>
              </Button>
              <Button variant="outline" onClick={() => refreshStatsMutation.mutate()} disabled={refreshStatsMutation.isPending}>
                {refreshStatsMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Rafraîchir les données
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Badges et Classement - Version simplifiée */}
      {filteredGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Badges et Classement
            </CardTitle>
            <CardDescription>
              Attribuez des badges aux étudiants les plus actifs dans les groupes Telegram
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>Cette fonctionnalité permet d'attribuer des badges aux étudiants les plus actifs dans les groupes Telegram durant une période spécifique.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border p-4 rounded-md">
                  <h3 className="font-medium mb-2">Badges disponibles</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Participation Star - Pour l'étudiant avec le meilleur score total</li>
                    <li>Media Master - Pour l'étudiant qui a partagé le plus de médias</li>
                    <li>Reaction King - Pour l'étudiant qui a reçu le plus de réactions</li>
                  </ul>
                </div>

                <div className="border p-4 rounded-md">
                  <h3 className="font-medium mb-2">Périodes d'analyse</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Semaine dernière</li>
                    <li>Mois dernier</li>
                    <li>Trimestre dernier</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end">
                <Button className="flex items-center gap-2">
                  <Award className="h-4 w-4" />
                  Attribuer des badges
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistiques */}
      {filteredGroups.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-md border text-sm text-gray-600">
          Affichage de {filteredGroups.length} groupes sur {telegramGroups?.length || 0} au total
        </div>
      )}
    </div>
  );
}
