import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getQueryFn, queryClient } from "../lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AutomationRule, TemplateMessage, Course, Session } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Bell, Calendar, Check, Clock, Edit, History, MessageSquare, Plus, RefreshCw, Send, Trash2, UserPlus, Video, Zap } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Création du schema Zod pour le formulaire d'automatisation
const automationSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  description: z.string().optional(),
  triggerType: z.string().min(1, "Sélectionnez un déclencheur"),
  triggerData: z.string().min(1, "Les données de déclenchement sont requises"),
  actionType: z.string().min(1, "Sélectionnez une action"),
  actionData: z.string().min(1, "Les données d'action sont requises"),
  isActive: z.boolean().default(true),
  // Champs spécifiques pour les messages matinaux
  sendTime: z.string().optional(),
  timeZone: z.string().optional(),
});

// Création du schema Zod pour le formulaire de template de message
const templateSchema = z.object({
  name: z.string().min(3, "Le nom doit contenir au moins 3 caractères"),
  type: z.string().min(1, "Sélectionnez un type de message"),
  content: z.string().min(10, "Le contenu du message doit contenir au moins 10 caractères"),
});

type AutomationFormValues = z.infer<typeof automationSchema>;
type TemplateFormValues = z.infer<typeof templateSchema>;

export default function AutomationPage() {
  const [editingAutomation, setEditingAutomation] = useState<AutomationRule | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<TemplateMessage | null>(null);
  const [isAutomationDialogOpen, setIsAutomationDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Récupération des automatisations
  const {
    data: automations,
    isLoading: isLoadingAutomations,
    error: automationsError,
  } = useQuery<AutomationRule[]>({
    queryKey: ["/api/automations"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Récupération des templates de messages
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = useQuery<TemplateMessage[]>({
    queryKey: ["/api/templates"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Récupération des cours pour les options de déclencheur
  const {
    data: courses,
    isLoading: isLoadingCourses,
  } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Récupération des sessions pour les options de déclencheur
  const {
    data: sessions,
    isLoading: isLoadingSessions,
  } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Formulaire pour les automatisations
  const automationForm = useForm<AutomationFormValues>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      name: "",
      description: "",
      triggerType: "",
      triggerData: "",
      actionType: "",
      actionData: "",
      isActive: true,
      sendTime: "06:00",
      timeZone: "GMT",
    },
  });

  // Formulaire pour les templates de messages
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      type: "",
      content: "",
    },
  });

  // Création d'une nouvelle automatisation
  const createAutomationMutation = useMutation({
    mutationFn: async (data: AutomationFormValues) => {
      const res = await apiRequest("POST", "/api/automations", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Automatisation créée",
        description: "L'automatisation a été créée avec succès",
      });
      setIsAutomationDialogOpen(false);
      automationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création de l'automatisation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mise à jour d'une automatisation existante
  const updateAutomationMutation = useMutation({
    mutationFn: async (data: AutomationFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/automations/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Automatisation mise à jour",
        description: "L'automatisation a été mise à jour avec succès",
      });
      setIsAutomationDialogOpen(false);
      setEditingAutomation(null);
      automationForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour de l'automatisation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Suppression d'une automatisation
  const deleteAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/automations/${id}`);
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Automatisation supprimée",
        description: "L'automatisation a été supprimée avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/automations"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression de l'automatisation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Création d'un nouveau template
  const createTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const res = await apiRequest("POST", "/api/templates", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template créé",
        description: "Le template de message a été créé avec succès",
      });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la création du template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mise à jour d'un template existant
  const updateTemplateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues & { id: number }) => {
      const { id, ...updateData } = data;
      const res = await apiRequest("PATCH", `/api/templates/${id}`, updateData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template mis à jour",
        description: "Le template de message a été mis à jour avec succès",
      });
      setIsTemplateDialogOpen(false);
      setEditingTemplate(null);
      templateForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la mise à jour du template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Suppression d'un template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/templates/${id}`);
      return id;
    },
    onSuccess: (id) => {
      toast({
        title: "Template supprimé",
        description: "Le template de message a été supprimé avec succès",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de la suppression du template: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Test d'une automatisation (envoi manuel)
  const testAutomationMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/automations/${id}/test`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Automatisation exécutée",
        description: "L'automatisation a été exécutée avec succès",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'exécution de l'automatisation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Mise à jour des états de formulaire lors de l'édition
  useEffect(() => {
    if (editingAutomation) {
      automationForm.reset({
        name: editingAutomation.name,
        description: editingAutomation.description || "",
        triggerType: editingAutomation.triggerType,
        triggerData: editingAutomation.triggerData,
        actionType: editingAutomation.actionType,
        actionData: editingAutomation.actionData,
        isActive: editingAutomation.isActive,
        sendTime: editingAutomation.sendTime || "06:00",
        timeZone: editingAutomation.timeZone || "GMT",
      });
      setIsAutomationDialogOpen(true);
    }
  }, [editingAutomation, automationForm]);

  useEffect(() => {
    if (editingTemplate) {
      templateForm.reset({
        name: editingTemplate.name,
        type: editingTemplate.type,
        content: editingTemplate.content,
      });
      setIsTemplateDialogOpen(true);
    }
  }, [editingTemplate, templateForm]);

  // Soumission des formulaires
  const onSubmitAutomation = (data: AutomationFormValues) => {
    if (editingAutomation) {
      updateAutomationMutation.mutate({ ...data, id: editingAutomation.id });
    } else {
      createAutomationMutation.mutate(data);
    }
  };

  const onSubmitTemplate = (data: TemplateFormValues) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate({ ...data, id: editingTemplate.id });
    } else {
      createTemplateMutation.mutate(data);
    }
  };

  // Fonctions d'aide pour l'affichage des noms de type
  const getTriggerTypeName = (type: string) => {
    switch (type) {
      case "session-before":
        return "Avant une session";
      case "session-after":
        return "Après une session";
      case "course-start":
        return "Début de cours";
      case "course-end":
        return "Fin de cours";
      case "new-user":
        return "Nouvel utilisateur";
      default:
        return type;
    }
  };

  const getActionTypeName = (type: string) => {
    switch (type) {
      case "send-telegram":
        return "Envoyer message Telegram";
      case "create-zoom":
        return "Créer réunion Zoom";
      case "send-email":
        return "Envoyer un email";
      case "award-badge":
        return "Attribuer un badge";
      default:
        return type;
    }
  };

  const getTemplateTypeName = (type: string) => {
    switch (type) {
      case "course-reminder":
        return "Rappel de cours";
      case "announcement":
        return "Annonce";
      case "badge-award":
        return "Attribution de badge";
      case "welcome":
        return "Message de bienvenue";
      default:
        return type;
    }
  };

  // Rendu de la page
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Automatisations & Notifications</h1>
          <p className="text-muted-foreground mt-2">
            Gérez les règles d'automatisation pour les cours, les sessions Zoom et les messages Telegram
          </p>
        </div>
      </div>

      <Tabs defaultValue="automations" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-3xl">
          <TabsTrigger value="automations" className="flex items-center gap-2">
            <Zap size={16} />
            <span>Automatisations</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <MessageSquare size={16} />
            <span>Templates de messages</span>
          </TabsTrigger>
          <TabsTrigger value="daily-messages" className="flex items-center gap-2">
            <Clock size={16} />
            <span>Messages matinaux</span>
          </TabsTrigger>
        </TabsList>

        {/* Onglet Automatisations */}
        <TabsContent value="automations" className="space-y-4 mt-4">
          <div className="flex flex-col space-y-4 mb-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Automatisations personnalisées</h2>
              <Button
                onClick={() => {
                  setEditingAutomation(null);
                  automationForm.reset({
                    name: "",
                    description: "",
                    triggerType: "",
                    triggerData: "",
                    actionType: "",
                    actionData: "",
                    isActive: true,
                  });
                  setIsAutomationDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Nouvelle automatisation</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors">
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4" onClick={() => {
                  setEditingAutomation(null);
                  automationForm.reset({
                    name: "Rappel de cours 1h avant",
                    description: "Envoie un rappel Telegram 1h avant chaque session",
                    triggerType: "session-before",
                    triggerData: "3600", // 1 heure en secondes
                    actionType: "send-telegram",
                    actionData: templates?.find(t => t.type === 'course-reminder')?.id.toString() || "",
                    isActive: true,
                  });
                  setIsAutomationDialogOpen(true);
                }}>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell size={24} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-center">Rappel avant session</h3>
                  <p className="text-sm text-muted-foreground text-center">Envoie un rappel avant chaque session de cours</p>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors">
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4" onClick={() => {
                  setEditingAutomation(null);
                  automationForm.reset({
                    name: "Création automatique des réunions Zoom",
                    description: "Crée automatiquement les réunions Zoom 24h avant chaque session",
                    triggerType: "session-before",
                    triggerData: "86400", // 24 heures en secondes
                    actionType: "create-zoom",
                    actionData: "topic={course}, duration=60, timezone=GMT",
                    isActive: true,
                  });
                  setIsAutomationDialogOpen(true);
                }}>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Video size={24} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-center">Création Zoom automatique</h3>
                  <p className="text-sm text-muted-foreground text-center">Crée les réunions Zoom avant les sessions</p>
                </CardContent>
              </Card>

              <Card className="border-dashed border-2 hover:border-primary/50 cursor-pointer transition-colors">
                <CardContent className="p-6 flex flex-col items-center justify-center space-y-4" onClick={() => {
                  setEditingAutomation(null);
                  automationForm.reset({
                    name: "Message de bienvenue",
                    description: "Envoie un message de bienvenue aux nouveaux étudiants",
                    triggerType: "new-user",
                    triggerData: "role=student",
                    actionType: "send-telegram",
                    actionData: templates?.find(t => t.type === 'welcome')?.id.toString() || "",
                    isActive: true,
                  });
                  setIsAutomationDialogOpen(true);
                }}>
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus size={24} className="text-primary" />
                  </div>
                  <h3 className="text-lg font-medium text-center">Message de bienvenue</h3>
                  <p className="text-sm text-muted-foreground text-center">Accueille les nouveaux étudiants automatiquement</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {isLoadingAutomations ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-border/40">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : automationsError ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Erreur lors du chargement des automatisations</h3>
              <p className="text-muted-foreground">Veuillez réessayer ultérieurement</p>
            </div>
          ) : !automations || automations.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-background">
              <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Aucune automatisation</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre première règle d'automatisation pour coordonner les notifications
              </p>
              <Button
                onClick={() => {
                  setEditingAutomation(null);
                  automationForm.reset();
                  setIsAutomationDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Créer une automatisation</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {automations.map((automation) => (
                <Card key={automation.id} className={`border ${automation.isActive ? 'border-primary/20' : 'border-border/40 opacity-70'}`}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{automation.name}</CardTitle>
                      <Badge variant={automation.isActive ? "default" : "outline"}>
                        {automation.isActive ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    <CardDescription>{automation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Déclencheur</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock size={14} />
                          {getTriggerTypeName(automation.triggerType)}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">Action</span>
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Send size={14} />
                          {getActionTypeName(automation.actionType)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingAutomation(automation)}
                        className="flex items-center gap-1"
                      >
                        <Edit size={14} />
                        <span>Modifier</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1 text-destructive">
                            <Trash2 size={14} />
                            <span>Supprimer</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Cette automatisation sera supprimée définitivement.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteAutomationMutation.mutate(automation.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => testAutomationMutation.mutate(automation.id)}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw size={14} className={testAutomationMutation.isPending ? "animate-spin" : ""} />
                      <span>Tester</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Formulaire d'automatisation dans une dialogue */}
          <Dialog open={isAutomationDialogOpen} onOpenChange={setIsAutomationDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingAutomation ? "Modifier l'automatisation" : "Créer une nouvelle automatisation"}</DialogTitle>
                <DialogDescription>
                  {editingAutomation
                    ? "Mettez à jour les détails de cette règle d'automatisation"
                    : "Configurez une nouvelle règle d'automatisation pour coordonner les notifications"}
                </DialogDescription>
              </DialogHeader>
              <Form {...automationForm}>
                <form onSubmit={automationForm.handleSubmit(onSubmitAutomation)} className="space-y-4">
                  <FormField
                    control={automationForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom de l'automatisation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={automationForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Description de l'automatisation" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <h3 className="text-md font-semibold">Déclencheur</h3>
                      <FormField
                        control={automationForm.control}
                        name="triggerType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de déclencheur</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un déclencheur" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="session-before">Avant une session</SelectItem>
                                <SelectItem value="session-after">Après une session</SelectItem>
                                <SelectItem value="course-start">Début de cours</SelectItem>
                                <SelectItem value="course-end">Fin de cours</SelectItem>
                                <SelectItem value="new-user">Nouvel utilisateur</SelectItem>
                                <SelectItem value="daily-courses-message">Messages matinaux</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={automationForm.control}
                        name="triggerData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Configuration du déclencheur</FormLabel>
                            <FormControl>
                              {automationForm.watch("triggerType") === "session-before" ||
                              automationForm.watch("triggerType") === "session-after" ? (
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner une session" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingSessions ? (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Chargement...</span>
                                      </div>
                                    ) : sessions && sessions.length > 0 ? (
                                      sessions.map(session => (
                                        <SelectItem key={session.id} value={session.id.toString()}>
                                          Session #{session.sessionNumber} - {new Date(session.scheduledDate).toLocaleDateString()}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Aucune session disponible</span>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : automationForm.watch("triggerType") === "daily-courses-message" ? (
                                <Input placeholder="Expression CRON (ex: 0 6 * * *)" {...field} />
                              ) : automationForm.watch("triggerType") === "course-start" ||
                                 automationForm.watch("triggerType") === "course-end" ? (
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un cours" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingCourses ? (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Chargement...</span>
                                      </div>
                                    ) : courses && courses.length > 0 ? (
                                      courses.map(course => (
                                        <SelectItem key={course.id} value={course.id.toString()}>
                                          {course.name}
                                        </SelectItem>
                                      ))
                                    ) : (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Aucun cours disponible</span>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input placeholder="Données de déclenchement" {...field} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-md font-semibold">Action</h3>
                      <FormField
                        control={automationForm.control}
                        name="actionType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type d'action</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une action" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="send-telegram">Envoyer message Telegram</SelectItem>
                                <SelectItem value="create-zoom">Créer réunion Zoom</SelectItem>
                                <SelectItem value="send-email">Envoyer un email</SelectItem>
                                <SelectItem value="award-badge">Attribuer un badge</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={automationForm.control}
                        name="actionData"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Configuration de l'action</FormLabel>
                            <FormControl>
                              {automationForm.watch("actionType") === "send-telegram" ? (
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  value={field.value}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un template" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {isLoadingTemplates ? (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Chargement...</span>
                                      </div>
                                    ) : templates && templates.length > 0 ? (
                                      templates
                                        .filter(template => template.type === "course-reminder" || template.type === "announcement")
                                        .map(template => (
                                          <SelectItem key={template.id} value={template.id.toString()}>
                                            {template.name}
                                          </SelectItem>
                                        ))
                                    ) : (
                                      <div className="flex justify-center p-2">
                                        <span className="text-sm text-muted-foreground">Aucun template disponible</span>
                                      </div>
                                    )}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Input placeholder="Données d'action" {...field} />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Champs spécifiques pour les messages matinaux */}
                  {automationForm.watch("triggerType") === "daily-courses-message" && (
                    <div className="space-y-4 border rounded-lg p-4">
                      <h3 className="text-md font-semibold">Configuration des messages matinaux</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={automationForm.control}
                          name="sendTime"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Heure d'envoi</FormLabel>
                              <FormControl>
                                <Input type="time" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={automationForm.control}
                          name="timeZone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fuseau horaire</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un fuseau horaire" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="GMT">GMT</SelectItem>
                                  <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                                  <SelectItem value="Africa/Dakar">Africa/Dakar</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                  <FormField
                    control={automationForm.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">État de l'automatisation</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Activer ou désactiver cette règle d'automatisation
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAutomationDialogOpen(false);
                        setEditingAutomation(null);
                        automationForm.reset();
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createAutomationMutation.isPending || updateAutomationMutation.isPending}
                    >
                      {createAutomationMutation.isPending || updateAutomationMutation.isPending
                        ? <span className="flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Traitement...</span>
                        : editingAutomation ? "Mettre à jour" : "Créer"
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onglet Templates de Message */}
        <TabsContent value="templates" className="space-y-4 mt-4">
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => {
                setEditingTemplate(null);
                templateForm.reset({
                  name: "",
                  type: "",
                  content: "",
                });
                setIsTemplateDialogOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Nouveau template</span>
            </Button>
          </div>

          {isLoadingTemplates ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border border-border/40">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-9 w-20" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : templatesError ? (
            <div className="text-center py-10">
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Erreur lors du chargement des templates</h3>
              <p className="text-muted-foreground">Veuillez réessayer ultérieurement</p>
            </div>
          ) : !templates || templates.length === 0 ? (
            <div className="text-center py-16 border rounded-lg bg-background">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Aucun template de message</h3>
              <p className="text-muted-foreground mb-6">
                Créez votre premier template pour standardiser vos messages
              </p>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  templateForm.reset();
                  setIsTemplateDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Créer un template</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {templates.map((template) => (
                <Card key={template.id} className="border border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{template.name}</CardTitle>
                      <Badge variant="outline">
                        {getTemplateTypeName(template.type)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border p-3 text-sm max-h-32 overflow-auto">
                      {template.content}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTemplate(template)}
                        className="flex items-center gap-1"
                      >
                        <Edit size={14} />
                        <span>Modifier</span>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex items-center gap-1 text-destructive">
                            <Trash2 size={14} />
                            <span>Supprimer</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Êtes-vous sûr?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Cette action ne peut pas être annulée. Ce template sera supprimé définitivement.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              className="bg-destructive hover:bg-destructive/90"
                            >
                              Supprimer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          {/* Formulaire de template dans une dialogue */}
          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingTemplate ? "Modifier le template" : "Créer un nouveau template"}</DialogTitle>
                <DialogDescription>
                  {editingTemplate
                    ? "Mettez à jour ce template de message"
                    : "Créez un nouveau template de message pour vos notifications"}
                </DialogDescription>
              </DialogHeader>
              <Form {...templateForm}>
                <form onSubmit={templateForm.handleSubmit(onSubmitTemplate)} className="space-y-4">
                  <FormField
                    control={templateForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom</FormLabel>
                        <FormControl>
                          <Input placeholder="Nom du template" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Type de message</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="course-reminder">Rappel de cours</SelectItem>
                            <SelectItem value="announcement">Annonce</SelectItem>
                            <SelectItem value="badge-award">Attribution de badge</SelectItem>
                            <SelectItem value="welcome">Message de bienvenue</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={templateForm.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenu du message</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Contenu du message avec variables: {course}, {instructor}, {time}, {date}, {link}, etc."
                            {...field}
                            className="min-h-[200px]"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsTemplateDialogOpen(false);
                        setEditingTemplate(null);
                        templateForm.reset();
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="submit"
                      disabled={createTemplateMutation.isPending || updateTemplateMutation.isPending}
                    >
                      {createTemplateMutation.isPending || updateTemplateMutation.isPending
                        ? <span className="flex items-center gap-1"><RefreshCw size={14} className="animate-spin" /> Traitement...</span>
                        : editingTemplate ? "Mettre à jour" : "Créer"
                      }
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Onglet Messages matinaux */}
        <TabsContent value="daily-messages" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Configuration des messages matinaux</h2>
                <Button
                  onClick={() => {
                    // Envoyer manuellement les messages matinaux
                    const sendDailyMessages = async () => {
                      try {
                        const res = await apiRequest("POST", "/api/daily-messages/send");
                        const data = await res.json();

                        toast({
                          title: "Messages envoyés",
                          description: "Les messages matinaux ont été envoyés avec succès",
                        });
                      } catch (error) {
                        toast({
                          title: "Erreur",
                          description: `Erreur lors de l'envoi des messages: ${error.message}`,
                          variant: "destructive",
                        });
                      }
                    };

                    sendDailyMessages();
                  }}
                  className="flex items-center gap-2"
                >
                  <Send size={16} />
                  <span>Envoyer maintenant</span>
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Paramètres d'envoi automatique</CardTitle>
                  <CardDescription>
                    Configurez l'heure et les jours d'envoi des messages de rappel de cours
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Automatisation existante pour les messages matinaux */}
                  {automations && automations.filter(a => a.triggerType === 'daily-courses-message').length > 0 ? (
                    <div className="space-y-6">
                      {automations.filter(a => a.triggerType === 'daily-courses-message').map((rule) => (
                        <div key={rule.id} className="border rounded-lg p-4 space-y-4 bg-card">
                          <div className="flex justify-between items-center">
                            <div className="space-y-1">
                              <h3 className="text-lg font-medium">{rule.name}</h3>
                              <p className="text-sm text-muted-foreground">{rule.description}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm ${rule.isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {rule.isActive ? 'Actif' : 'Inactif'}
                              </span>
                              <Switch
                                checked={rule.isActive}
                                onCheckedChange={(checked) => {
                                  updateAutomationMutation.mutate({
                                    ...rule,
                                    isActive: checked
                                  });
                                }}
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/30 p-3 rounded-md">
                            <div>
                              <h4 className="text-sm font-medium mb-1">Heure d'envoi</h4>
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-primary" />
                                <span className="font-medium">{rule.sendTime || "06:00"}</span>
                                <span className="text-xs text-muted-foreground">{rule.timeZone || "GMT"}</span>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium mb-1">Expression CRON</h4>
                              <div className="flex items-center gap-2">
                                <Calendar size={16} className="text-primary" />
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">{rule.triggerData}</code>
                              </div>
                            </div>

                            <div>
                              <h4 className="text-sm font-medium mb-1">Dernier envoi</h4>
                              <div className="flex items-center gap-2">
                                <History size={16} className="text-primary" />
                                <span className="text-sm">
                                  {rule.lastSent ? new Date(rule.lastSent).toLocaleString() : "Jamais"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingAutomation(rule)}
                              className="flex items-center gap-1"
                            >
                              <Edit size={14} />
                              <span>Modifier</span>
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testAutomationMutation.mutate(rule.id)}
                              className="flex items-center gap-1"
                            >
                              <Send size={14} />
                              <span>Tester</span>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg bg-background">
                      <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold">Aucune configuration d'envoi matinal</h3>
                      <p className="text-muted-foreground mb-6">
                        Créez une règle d'automatisation pour l'envoi matinal des messages de cours
                      </p>
                      <Button
                        onClick={() => {
                          setEditingAutomation(null);
                          automationForm.reset({
                            name: "Envoi matinal des messages de cours",
                            description: "Envoie automatiquement les messages de rappel pour les cours du jour",
                            triggerType: "daily-courses-message",
                            triggerData: "0 6 * * *", // Tous les jours à 6h
                            actionType: "send-telegram",
                            actionData: templates?.find(t => t.type === 'course-reminder')?.id.toString() || "",
                            isActive: true,
                            sendTime: "06:00",
                            timeZone: "GMT"
                          });
                          setIsAutomationDialogOpen(true);
                        }}
                        className="flex items-center gap-2"
                      >
                        <Plus size={16} />
                        <span>Configurer l'envoi matinal</span>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Historique des messages envoyés</CardTitle>
                  <CardDescription>
                    Consultez l'historique des messages de cours envoyés automatiquement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Tableau des logs de messages */}
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Cours</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Aucune donnée disponible</TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>Guide d'utilisation</CardTitle>
                  <CardDescription>
                    Comment configurer les messages matinaux
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <span className="flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center text-primary">1</span>
                      Créer un template de message
                    </h3>
                    <p className="text-sm text-muted-foreground pl-8">
                      Commencez par créer un template de type "Rappel de cours" dans l'onglet Templates.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <span className="flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center text-primary">2</span>
                      Configurer l'automatisation
                    </h3>
                    <p className="text-sm text-muted-foreground pl-8">
                      Créez une automatisation avec le déclencheur "Messages matinaux" et définissez l'heure d'envoi.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <span className="flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center text-primary">3</span>
                      Variables disponibles
                    </h3>
                    <div className="text-sm text-muted-foreground pl-8 space-y-1">
                      <p><code className="text-xs bg-muted px-1 py-0.5 rounded">{'{course}'}</code> - Nom du cours</p>
                      <p><code className="text-xs bg-muted px-1 py-0.5 rounded">{'{instructor}'}</code> - Nom du professeur</p>
                      <p><code className="text-xs bg-muted px-1 py-0.5 rounded">{'{time}'}</code> - Heure de la session</p>
                      <p><code className="text-xs bg-muted px-1 py-0.5 rounded">{'{zoom_link}'}</code> - Lien Zoom</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <span className="flex h-6 w-6 rounded-full bg-primary/10 items-center justify-center text-primary">4</span>
                      Expression CRON
                    </h3>
                    <p className="text-sm text-muted-foreground pl-8">
                      Format: <code className="text-xs bg-muted px-1 py-0.5 rounded">minute heure jour mois jour_semaine</code>
                    </p>
                    <p className="text-sm text-muted-foreground pl-8">
                      Exemple: <code className="text-xs bg-muted px-1 py-0.5 rounded">0 6 * * *</code> = tous les jours à 6h00
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}