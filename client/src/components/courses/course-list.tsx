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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Calendar,
  Edit,
  Filter,
  Globe,
  Loader2,
  MoreHorizontal,
  Pencil,
  Search,
  Trash,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

// Schéma de validation pour l'édition d'un cours
const editCourseSchema = z.object({
  id: z.number(),
  courseName: z.string().min(1, "Le nom du cours est requis"),
  level: z.string().min(1, "Le niveau est requis"),
  teacherName: z.string().min(1, "Le nom du professeur est requis"),
  telegramGroup: z.string().optional(),
  zoomHostEmail: z.string().email("L'email doit être valide").optional().or(z.literal('')),
});

type EditCourseFormValues = z.infer<typeof editCourseSchema>;

export function CourseList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<FixedSchedule | null>(null);

  // Récupérer les cours planifiés
  const { data: fixedSchedules, isLoading } = useQuery<FixedSchedule[]>({
    queryKey: ["/api/fixed-schedules"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fixed-schedules");
      return res.json();
    },
  });

  // Formulaire d'édition
  const editCourseForm = useForm<EditCourseFormValues>({
    resolver: zodResolver(editCourseSchema),
    defaultValues: {
      id: 0,
      courseName: "",
      level: "bbg",
      teacherName: "",
      telegramGroup: "",
      zoomHostEmail: "",
    },
  });

  // Mutation pour mettre à jour un cours
  const updateCourseMutation = useMutation({
    mutationFn: async (data: EditCourseFormValues) => {
      const res = await apiRequest("PUT", `/api/fixed-schedules/${data.id}`, data);
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
    onError: (error) => {
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
    editCourseForm.reset({
      id: course.id,
      courseName: course.courseName,
      level: course.level,
      teacherName: course.teacherName,
      telegramGroup: course.telegramGroup,
      zoomHostEmail: course.zoomHostEmail,
    });
    setIsEditDialogOpen(true);
  };

  // Fonction pour soumettre le formulaire d'édition
  const onEditCourseSubmit = (data: EditCourseFormValues) => {
    updateCourseMutation.mutate(data);
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

  // Fonction pour convertir l'heure locale en GMT
  const convertToGMT = (time: string) => {
    if (!time) return "00:00";

    // Extraire les heures et les minutes
    const [hours, minutes] = time.split(":").map(Number);

    // Supposons que l'heure locale est GMT+1 (France)
    // Soustraire 1 heure pour obtenir l'heure GMT
    let gmtHours = hours - 1;

    // Gérer le changement de jour
    if (gmtHours < 0) gmtHours += 24;

    // Formater l'heure GMT
    return `${gmtHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  // Extraire les cours uniques (par nom et niveau)
  const uniqueCourses = useMemo(() => {
    if (!fixedSchedules) return [];

    const courseMap = new Map();

    fixedSchedules.forEach(schedule => {
      const key = `${schedule.courseName}-${schedule.level}`;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          name: schedule.courseName,
          level: schedule.level,
          teachers: new Set([schedule.teacherName]),
          days: new Set([schedule.day]),
          sessions: 1
        });
      } else {
        const course = courseMap.get(key);
        course.teachers.add(schedule.teacherName);
        course.days.add(schedule.day);
        course.sessions++;
      }
    });

    return Array.from(courseMap.values()).map(course => ({
      ...course,
      teachers: Array.from(course.teachers),
      days: Array.from(course.days).map(day => formatDay(day as string))
    }));
  }, [fixedSchedules]);

  // Filtrer les cours
  const filteredCourses = useMemo(() => {
    if (!uniqueCourses) return [];

    return uniqueCourses
      .filter(course => {
        // Filtre de recherche
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          course.name.toLowerCase().includes(searchLower) ||
          course.teachers.some(teacher => teacher.toLowerCase().includes(searchLower));

        // Filtre par niveau
        const matchesLevel = levelFilter === "all" || course.level === levelFilter;

        return matchesSearch && matchesLevel;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [uniqueCourses, searchTerm, levelFilter]);

  // Statistiques des cours
  const courseStats = useMemo(() => {
    if (!fixedSchedules) return { total: 0, bbg: 0, abg: 0, ig: 0 };

    return {
      total: uniqueCourses.length,
      bbg: uniqueCourses.filter(course => course.level === "bbg").length,
      abg: uniqueCourses.filter(course => course.level === "abg").length,
      ig: uniqueCourses.filter(course => course.level === "ig").length
    };
  }, [uniqueCourses, fixedSchedules]);

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
    <div className="space-y-6">
      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total des cours</p>
                <h3 className="text-2xl font-bold">{courseStats.total}</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Niveau BBG</p>
                <h3 className="text-2xl font-bold">{courseStats.bbg}</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-full">
                <Badge className="bg-blue-100 text-blue-800 h-6 px-3">BBG</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Niveau ABG</p>
                <h3 className="text-2xl font-bold">{courseStats.abg}</h3>
              </div>
              <div className="bg-green-50 p-3 rounded-full">
                <Badge className="bg-green-100 text-green-800 h-6 px-3">ABG</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Niveau IG</p>
                <h3 className="text-2xl font-bold">{courseStats.ig}</h3>
              </div>
              <div className="bg-purple-50 p-3 rounded-full">
                <Badge className="bg-purple-100 text-purple-800 h-6 px-3">IG</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-md border space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtres
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="search">Recherche</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                id="search"
                placeholder="Rechercher un cours ou un professeur"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
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
      </div>

      {/* Liste des cours */}
      <div className="rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Cours</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Coachs</TableHead>
              <TableHead>Jours</TableHead>
              <TableHead>Sessions</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCourses.length > 0 ? (
              filteredCourses.map((course, index) => (
                <TableRow key={`${course.name}-${course.level}`}>
                  <TableCell className="font-medium text-center">{index + 1}</TableCell>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getLevelBadgeColor(course.level)}
                    >
                      {course.level.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-gray-500" />
                      {course.teachers.join(", ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {course.days.join(", ")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{course.sessions}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => {
                          // Trouver le premier cours correspondant pour l'édition
                          const courseToEdit = fixedSchedules?.find(c =>
                            c.courseName === course.name && c.level === course.level
                          );
                          if (courseToEdit) {
                            handleEditCourse(courseToEdit);
                          }
                        }}>
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                  {uniqueCourses.length > 0
                    ? "Aucun cours ne correspond aux filtres sélectionnés."
                    : "Aucun cours trouvé. Importez le planning fixe pour commencer."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Statistiques */}
      {filteredCourses.length > 0 && (
        <div className="bg-gray-50 p-3 rounded-md border text-sm text-gray-600">
          Affichage de {filteredCourses.length} cours sur {uniqueCourses.length} au total
        </div>
      )}

      {/* Dialogue d'édition de cours */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le cours</DialogTitle>
            <DialogDescription>
              Modifiez les informations du cours
            </DialogDescription>
          </DialogHeader>

          <Form {...editCourseForm}>
            <form onSubmit={editCourseForm.handleSubmit(onEditCourseSubmit)} className="space-y-4">
              <FormField
                control={editCourseForm.control}
                name="courseName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du cours</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCourseForm.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Niveau</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez un niveau" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bbg">BBG (Débutant)</SelectItem>
                        <SelectItem value="abg">ABG (Intermédiaire)</SelectItem>
                        <SelectItem value="ig">IG (Avancé)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCourseForm.control}
                name="teacherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Coach</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCourseForm.control}
                name="telegramGroup"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Groupe Telegram</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Exemple: @nom_du_groupe
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editCourseForm.control}
                name="zoomHostEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email de l'hôte Zoom</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={updateCourseMutation.isPending}
                >
                  {updateCourseMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Pencil className="mr-2 h-4 w-4" />
                  )}
                  Mettre à jour
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
