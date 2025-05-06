import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Schéma de validation pour le formulaire de cours
const courseSchema = z.object({
  courseName: z.string().min(1, "Le nom du cours est requis"),
  teacherName: z.string().min(1, "Le nom du professeur est requis"),
  email: z.string().email("L'email doit être valide").optional().or(z.literal('')),
  day: z.string().min(1, "Le jour est requis"),
  timeFormatted: z.string().optional(),
  timeGMT: z.string().optional(),
  timeFrance: z.string().optional(),
  assistant: z.string().min(1, "L'assistant est requis"),
  telegramGroup: z.string().optional().or(z.literal('')),
  level: z.string().min(1, "Le niveau est requis"),
  time: z.string().min(1, "L'heure est requise"),
  duration: z.number().min(30, "La durée minimale est de 30 minutes"),
});

export type CourseFormValues = z.infer<typeof courseSchema>;

interface CourseFormProps {
  defaultValues?: Partial<CourseFormValues>;
  onSubmit: (data: CourseFormValues) => void;
  isSubmitting: boolean;
  mode: "add" | "edit";
}

export function CourseForm({ defaultValues, onSubmit, isSubmitting, mode }: CourseFormProps) {
  // Liste des assistants disponibles
  const assistants = ["Hiba Chary", "Safaa Zaki"];
  
  // Initialiser le formulaire avec les valeurs par défaut
  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      courseName: "",
      teacherName: "",
      email: "",
      day: "monday",
      timeFormatted: "",
      timeGMT: "",
      timeFrance: "",
      assistant: "Hiba Chary",
      telegramGroup: "",
      level: "bbg",
      time: "20:00",
      duration: 60,
      ...defaultValues,
    },
  });

  // Fonction pour formater l'heure GMT et France
  const formatTimes = (time: string) => {
    if (!time) return { gmt: "", france: "" };
    
    const [hours, minutes] = time.split(":").map(Number);
    
    // Heure GMT (GMT+0)
    const gmtHours = hours - 1;
    const gmtFormatted = `${gmtHours}h ${minutes > 0 ? minutes : "00"} GMT`;
    
    // Heure France (GMT+1)
    const franceFormatted = `${hours}h ${minutes > 0 ? minutes : "00"} France`;
    
    return { gmt: gmtFormatted, france: franceFormatted };
  };

  // Mettre à jour les heures GMT et France lorsque l'heure change
  useEffect(() => {
    const time = form.watch("time");
    if (time) {
      const { gmt, france } = formatTimes(time);
      form.setValue("timeGMT", gmt);
      form.setValue("timeFrance", france);
    }
  }, [form.watch("time")]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Nom du cours */}
        <FormField
          control={form.control}
          name="courseName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>📋 Nom du cours</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  readOnly={mode === "edit"}
                  className={mode === "edit" ? "bg-gray-100" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Nom complet */}
        <FormField
          control={form.control}
          name="teacherName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>👤 Nom complet</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  readOnly={mode === "edit"}
                  className={mode === "edit" ? "bg-gray-100" : ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email */}
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>📧 Email</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          {/* Jour */}
          <FormField
            control={form.control}
            name="day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>📅 Jour</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un jour" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="monday">Monday</SelectItem>
                    <SelectItem value="tuesday">Tuesday</SelectItem>
                    <SelectItem value="wednesday">Wednesday</SelectItem>
                    <SelectItem value="thursday">Thursday</SelectItem>
                    <SelectItem value="friday">Friday</SelectItem>
                    <SelectItem value="saturday">Saturday</SelectItem>
                    <SelectItem value="sunday">Sunday</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Heure */}
          <FormField
            control={form.control}
            name="time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>⏰ Heure</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Heure (France) */}
          <FormField
            control={form.control}
            name="timeFrance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>🕒 Heure (France)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    readOnly 
                    className="bg-gray-100"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Heure (GMT) */}
          <FormField
            control={form.control}
            name="timeGMT"
            render={({ field }) => (
              <FormItem>
                <FormLabel>🌍 Heure (GMT)</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    readOnly 
                    className="bg-gray-100"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Assistant */}
          <FormField
            control={form.control}
            name="assistant"
            render={({ field }) => (
              <FormItem>
                <FormLabel>🤖 Assistant</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un assistant" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {assistants.map((assistant) => (
                      <SelectItem key={assistant} value={assistant}>
                        {assistant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Niveau */}
          <FormField
            control={form.control}
            name="level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>📊 Niveau</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un niveau" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="bbg">BBG (Débutant)</SelectItem>
                    <SelectItem value="abg">ABG (Intermédiaire)</SelectItem>
                    <SelectItem value="ig">IG (Avancé)</SelectItem>
                    <SelectItem value="zbg">ZBG (Spécial)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* ID du groupe Telegram */}
        <FormField
          control={form.control}
          name="telegramGroup"
          render={({ field }) => (
            <FormItem>
              <FormLabel>🔗 ID du groupe Telegram</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Durée */}
        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>⏱️ Durée (minutes)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="30" 
                  step="15" 
                  {...field}
                  onChange={(e) => field.onChange(parseInt(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === "add" ? "Ajout en cours..." : "Mise à jour en cours..."}
            </>
          ) : (
            mode === "add" ? "Ajouter le cours" : "Mettre à jour le cours"
          )}
        </Button>
      </form>
    </Form>
  );
}
