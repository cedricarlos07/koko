import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Award, RefreshCw, Trophy, MessageSquare, Image, ThumbsUp, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// Types
interface TelegramBadge {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
}

interface TelegramStudent {
  studentId: number;
  telegramUserId: string;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  messageCount: number;
  reactionCount: number;
  mediaCount: number;
  totalScore: number;
}

interface Period {
  start: number;
  end: number;
  name: string;
}

// Composant pour afficher les badges et les meilleurs étudiants
export function TelegramBadges({ groupId }: { groupId: string }) {
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState<Period | null>(null);

  // Récupérer les badges
  const { data: badges, isLoading: isLoadingBadges } = useQuery<TelegramBadge[]>({
    queryKey: ["/api/telegram/badges"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/badges");
      return res.json();
    },
  });

  // Récupérer les périodes disponibles
  const { data: periods, isLoading: isLoadingPeriods } = useQuery<Period[]>({
    queryKey: ["/api/telegram/periods"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/telegram/periods");
      return res.json();
    },
    onSuccess: (data) => {
      if (data && data.length > 0 && !selectedPeriod) {
        setSelectedPeriod(data[0]);
      }
    },
  });

  // Récupérer les meilleurs étudiants pour la période sélectionnée
  const { data: topStudents, isLoading: isLoadingTopStudents, refetch: refetchTopStudents } = useQuery<TelegramStudent[]>({
    queryKey: ["/api/telegram/groups", groupId, "top-students", selectedPeriod],
    queryFn: async () => {
      if (!selectedPeriod) return [];
      const res = await apiRequest(
        "GET",
        `/api/telegram/groups/${groupId}/top-students?periodStart=${selectedPeriod.start}&periodEnd=${selectedPeriod.end}`
      );
      return res.json();
    },
    enabled: !!selectedPeriod,
  });

  // Mutation pour attribuer des badges aux meilleurs étudiants
  const awardBadgesMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriod) return null;
      const res = await apiRequest(
        "POST",
        `/api/telegram/groups/${groupId}/award-badges`,
        {
          periodStart: selectedPeriod.start,
          periodEnd: selectedPeriod.end
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Badges attribués",
        description: "Les badges ont été attribués aux meilleurs étudiants avec succès.",
      });
      refetchTopStudents();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'attribution des badges: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour simuler la participation des étudiants
  const simulateParticipationMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPeriod) return null;
      const res = await apiRequest(
        "POST",
        `/api/telegram/groups/${groupId}/simulate-participation`,
        {
          periodStart: selectedPeriod.start,
          periodEnd: selectedPeriod.end,
          studentCount: 15
        }
      );
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Participation simulée",
        description: "La participation des étudiants a été simulée avec succès.",
      });
      refetchTopStudents();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la simulation de la participation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour obtenir l'icône d'un badge
  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'star':
        return <Trophy className="h-5 w-5" />;
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'thumbs-up':
        return <ThumbsUp className="h-5 w-5" />;
      case 'calendar':
        return <Calendar className="h-5 w-5" />;
      case 'help-circle':
        return <MessageSquare className="h-5 w-5" />;
      default:
        return <Award className="h-5 w-5" />;
    }
  };

  // Fonction pour obtenir la couleur d'un badge
  const getBadgeColor = (colorName: string) => {
    switch (colorName) {
      case 'gold':
        return "bg-yellow-500 text-white";
      case 'blue':
        return "bg-blue-500 text-white";
      case 'green':
        return "bg-green-500 text-white";
      case 'purple':
        return "bg-purple-500 text-white";
      case 'orange':
        return "bg-orange-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  // Fonction pour obtenir les initiales d'un étudiant
  const getStudentInitials = (student: TelegramStudent) => {
    if (student.telegramFirstName && student.telegramLastName) {
      return `${student.telegramFirstName.charAt(0)}${student.telegramLastName.charAt(0)}`;
    } else if (student.telegramFirstName) {
      return student.telegramFirstName.charAt(0);
    } else if (student.telegramUsername) {
      return student.telegramUsername.charAt(0);
    } else {
      return "?";
    }
  };

  // Fonction pour obtenir le nom d'un étudiant
  const getStudentName = (student: TelegramStudent) => {
    if (student.telegramFirstName && student.telegramLastName) {
      return `${student.telegramFirstName} ${student.telegramLastName}`;
    } else if (student.telegramFirstName) {
      return student.telegramFirstName;
    } else if (student.telegramUsername) {
      return `@${student.telegramUsername}`;
    } else {
      return student.telegramUserId;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" />
          Badges et Classement
        </CardTitle>
        <CardDescription>
          Attribuez des badges aux étudiants les plus actifs dans le groupe Telegram
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Sélection de la période */}
          <div className="space-y-2">
            <Label htmlFor="period-select">Période</Label>
            <Select
              value={selectedPeriod?.name}
              onValueChange={(value) => {
                const period = periods?.find(p => p.name === value);
                if (period) {
                  setSelectedPeriod(period);
                }
              }}
              disabled={isLoadingPeriods}
            >
              <SelectTrigger id="period-select" className="w-full">
                <SelectValue placeholder="Sélectionner une période" />
              </SelectTrigger>
              <SelectContent>
                {periods?.map((period) => (
                  <SelectItem key={period.name} value={period.name}>
                    {period.name} ({new Date(period.start).toLocaleDateString()} - {new Date(period.end).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs defaultValue="top-students">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="top-students">Meilleurs Étudiants</TabsTrigger>
              <TabsTrigger value="badges">Badges Disponibles</TabsTrigger>
            </TabsList>

            {/* Onglet des meilleurs étudiants */}
            <TabsContent value="top-students" className="space-y-4">
              {isLoadingTopStudents ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : topStudents && topStudents.length > 0 ? (
                <div className="space-y-4">
                  {topStudents.map((student, index) => (
                    <div key={student.studentId} className="flex items-center justify-between p-2 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 font-bold text-lg w-6 text-center">
                          {index + 1}
                        </div>
                        <Avatar>
                          <AvatarFallback>{getStudentInitials(student)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{getStudentName(student)}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.messageCount} messages • {student.reactionCount} réactions • {student.mediaCount} médias
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Trophy className="h-3 w-3" />
                          {student.totalScore} pts
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucune donnée de participation pour cette période
                </div>
              )}
            </TabsContent>

            {/* Onglet des badges disponibles */}
            <TabsContent value="badges" className="space-y-4">
              {isLoadingBadges ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : badges && badges.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {badges.map((badge) => (
                    <div key={badge.id} className="flex items-start gap-3 p-3 rounded-lg border">
                      <div className={`p-2 rounded-full ${getBadgeColor(badge.color)}`}>
                        {getBadgeIcon(badge.icon)}
                      </div>
                      <div>
                        <div className="font-medium">{badge.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {badge.description}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Aucun badge disponible
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => simulateParticipationMutation.mutate()}
          disabled={simulateParticipationMutation.isPending || !selectedPeriod}
        >
          {simulateParticipationMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Simuler la participation
        </Button>
        <Button
          onClick={() => awardBadgesMutation.mutate()}
          disabled={awardBadgesMutation.isPending || !selectedPeriod || !topStudents || topStudents.length === 0}
        >
          {awardBadgesMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Award className="mr-2 h-4 w-4" />
          )}
          Attribuer les badges
        </Button>
      </CardFooter>
    </Card>
  );
}
