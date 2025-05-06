import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CourseForm, CourseFormValues } from "./course-form";

interface AddCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCourseDialog({ open, onOpenChange }: AddCourseDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation pour ajouter un cours
  const addCourseMutation = useMutation({
    mutationFn: async (data: CourseFormValues) => {
      // Transformer les données pour correspondre à l'API
      const apiData = {
        courseName: data.courseName,
        level: data.level,
        teacherName: data.teacherName,
        day: data.day,
        time: data.time,
        duration: data.duration,
        telegramGroup: data.telegramGroup || "",
        zoomHostEmail: data.email || "",
      };

      const res = await apiRequest("POST", "/api/fixed-schedules", apiData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fixed-schedules"] });
      onOpenChange(false);
      toast({
        title: "Cours ajouté",
        description: "Le cours a été ajouté avec succès",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'ajout du cours: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Fonction pour soumettre le formulaire d'ajout
  const onAddCourseSubmit = (data: CourseFormValues) => {
    addCourseMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouveau cours</DialogTitle>
          <DialogDescription>
            Remplissez les informations pour ajouter un nouveau cours au planning fixe.
          </DialogDescription>
        </DialogHeader>

        <CourseForm
          onSubmit={onAddCourseSubmit}
          isSubmitting={addCourseMutation.isPending}
          mode="add"
        />
      </DialogContent>
    </Dialog>
  );
}
