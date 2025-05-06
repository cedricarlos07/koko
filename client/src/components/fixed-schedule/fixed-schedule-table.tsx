import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Edit,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AddCourseDialog } from "./add-course-dialog";
import { CourseForm, CourseFormValues } from "./course-form";

// Interface pour les cours planifiés
interface FixedSchedule {
  id: number;
  courseName: string;
  level: string;
  teacherName: string;
  day: string;
  time: string;
  duration: number;
  telegramGroup: string;
  zoomHostEmail: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}



export function FixedScheduleTable() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [dayFilter, setDayFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<FixedSchedule | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<FixedSchedule | null>(null);

  // Récupérer les cours planifiés
  const { data: fixedSchedules = [], isLoading } = useQuery<FixedSchedule[]>({
    queryKey: ["/api/fixed-schedules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fixed-schedules");
      return res.json();
    },
  });

  // Mutation pour mettre à jour un cours
  const updateCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      // Transformer les données pour correspondre à l'API
      const apiData = {
        id: selectedCourse?.id,
        courseName: data.courseName,
        level: data.level,
        teacherName: data.teacherName,
        day: data.day,
        time: data.time,
        duration: data.duration,
        telegramGroup: data.telegramGroup || "",
        zoomHostEmail: data.email || "",
      };

      const res = await apiRequest("PUT", `/api/fixed-schedules/${selectedCourse?.id}`, apiData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-schedules"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Cours mis à jour",
        description: "Le cours a été mis à jour avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du cours: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour ouvrir le dialogue d'édition
  const handleEditCourse = (course: FixedSchedule) => {
    setSelectedCourse(course);
    setIsEditDialogOpen(true);
  };

  // Mutation pour activer/désactiver un cours planifié
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const res = await apiRequest("PUT", `/api/fixed-schedules/${id}/status`, {
        isActive,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-schedules"] });
      toast({
        title: "Statut mis à jour",
        description: "Le statut du cours planifié a été mis à jour avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du statut: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour créer une réunion Zoom
  const createZoomMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/fixed-schedules/${id}/zoom`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Réunion Zoom créée",
        description: "La réunion Zoom a été créée avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création de la réunion Zoom: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mutation pour supprimer un cours
  const deleteCourseMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/fixed-schedules/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-schedules"] });
      setCourseToDelete(null);
      toast({
        title: "Cours supprimé",
        description: "Le cours a été supprimé avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression du cours: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour confirmer la suppression d'un cours
  const handleDeleteCourse = (course: FixedSchedule) => {
    setCourseToDelete(course);
  };

  // Fonction pour effectuer la suppression
  const confirmDeleteCourse = () => {
    if (courseToDelete) {
      deleteCourseMutation.mutate(courseToDelete.id);
    }
  };

  // Mutation pour envoyer un message
  const sendMessageMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/fixed-schedules/${id}/message`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Message envoyé",
        description: "Le message a été envoyé avec succès",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'envoi du message: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour formater le jour de la semaine
  const formatDay = (day: string) => {
    const days: Record<string, string> = {
      monday: "Lundi",
      tuesday: "Mardi",
      wednesday: "Mercredi",
      thursday: "Jeudi",
      friday: "Vendredi",
      saturday: "Samedi",
      sunday: "Dimanche",
    };
    return days[day] || day;
  };

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

  // Fonction pour convertir l'heure locale en GMT
  const convertToGMT = (time: string) => {
    if (!time) return "00:00";

    try {
      // Extraire les heures et les minutes
      const parts = time.split(":");
      if (parts.length < 2) return "00:00";

      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);

      // Vérifier si les heures et les minutes sont des nombres valides
      if (isNaN(hours) || isNaN(minutes)) return "00:00";

      // Supposons que l'heure locale est GMT+1 (France)
      // Soustraire 1 heure pour obtenir l'heure GMT
      let gmtHours = hours - 1;

      // Gérer le changement de jour
      if (gmtHours < 0) gmtHours += 24;

      // Formater l'heure GMT
      return `${gmtHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
    } catch (error) {
      console.error("Erreur lors de la conversion de l'heure en GMT:", error);
      return "00:00";
    }
  };

  // Filtrer les cours planifiés
  const filteredSchedules = useMemo(() => {
    if (!fixedSchedules) return [];

    return fixedSchedules
      .filter(schedule => {
        // Filtre de recherche
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          schedule.courseName.toLowerCase().includes(searchLower) ||
          schedule.teacherName.toLowerCase().includes(searchLower);

        // Filtre par jour
        const matchesDay = dayFilter === "all" || schedule.day === dayFilter;

        // Filtre par niveau
        const matchesLevel = levelFilter === "all" || schedule.level === levelFilter;

        return matchesSearch && matchesDay && matchesLevel;
      })
      .sort((a, b) => {
        // Trier par jour de la semaine, puis par heure
        const dayOrder = { monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7 };
        const dayDiff = (dayOrder[a.day as keyof typeof dayOrder] || 0) - (dayOrder[b.day as keyof typeof dayOrder] || 0);

        if (dayDiff !== 0) return dayDiff;

        // Trier par heure
        return a.time.localeCompare(b.time);
      });
  }, [fixedSchedules, searchTerm, dayFilter, levelFilter]);

  if (isLoading) {
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
    <div className="space-y-4">
      {/* En-tête avec bouton d'ajout */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Planning des Cours</h2>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-green-600 hover:bg-green-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un cours
        </Button>
      </div>

      {/* Tableau des cours */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Nom du cours</TableHead>
              <TableHead>Coach</TableHead>
              <TableHead>Jour</TableHead>
              <TableHead>Heure</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fixedSchedules.map((schedule, index) => (
              <TableRow key={schedule.id}>
                <TableCell className="font-medium text-center">{index + 1}</TableCell>
                <TableCell className="font-medium">{schedule.courseName}</TableCell>
                <TableCell>{schedule.teacherName}</TableCell>
                <TableCell>{formatDay(schedule.day)}</TableCell>
                <TableCell>{schedule.time}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getLevelBadgeColor(schedule.level)}
                  >
                    {schedule.level.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditCourse(schedule)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteCourse(schedule)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {fixedSchedules.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                  Aucun cours trouvé. Cliquez sur "Ajouter un cours" pour commencer.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>



      {/* Dialogue d'édition de cours */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Modifier le cours</DialogTitle>
            <DialogDescription>
              Modifiez les informations du cours
            </DialogDescription>
          </DialogHeader>

          {selectedCourse && (
            <CourseForm
              defaultValues={{
                courseName: selectedCourse.courseName,
                teacherName: selectedCourse.teacherName,
                email: selectedCourse.zoomHostEmail,
                day: selectedCourse.day,
                time: selectedCourse.time,
                timeFrance: `${selectedCourse.time.split(":")[0]}h ${selectedCourse.time.split(":")[1]} France`,
                timeGMT: `${parseInt(selectedCourse.time.split(":")[0]) - 1}h ${selectedCourse.time.split(":")[1]} GMT`,
                assistant: "Hiba Chary", // Valeur par défaut, à ajuster selon les données
                telegramGroup: selectedCourse.telegramGroup,
                level: selectedCourse.level,
                duration: selectedCourse.duration,
              }}
              onSubmit={updateCourseMutation.mutate}
              isSubmitting={updateCourseMutation.isPending}
              mode="edit"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue d'ajout de cours */}
      <AddCourseDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce cours ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le cours <strong>{courseToDelete?.courseName}</strong> sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCourse}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteCourseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
