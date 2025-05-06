import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { TelegramGroupsManagement } from "@/components/telegram/telegram-groups-management";
import Header from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Send,
  MessageSquare,
  Users,
  BarChart,
  Sparkles,
  Loader2,
  RefreshCw,
  Info,
  ArrowRightLeft,
  Play,
  Plus,
  Trash2,
  Clock
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for Telegram-related data
interface TelegramGroup {
  courseId: number;
  courseName: string;
  courseLevel: string;
  memberCount: number;
  messageCount: number;
  groupLink: string;
}

interface TelegramActivity {
  id: number;
  userId: number;
  courseId: number;
  messageType: string;
  messageCount: number;
  date: number;
  createdAt: number;
}

interface TelegramChannelForward {
  id: number;
  sourceChannelId: string;
  sourceChannelName: string;
  targetGroupId: string;
  targetGroupName: string;
  isActive: boolean;
  lastForwardedMessageId?: number;
  lastForwardedAt?: number;
  createdAt: number;
  updatedAt: number;
}

interface Course {
  id: number;
  name: string;
  level: string;
  telegramGroupLink?: string;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  telegramUsername?: string;
}

// Form schema for sending announcements
const announcementSchema = z.object({
  courseId: z.number({
    required_error: "Please select a course",
  }),
  content: z.string().min(10, {
    message: "Announcement must be at least 10 characters.",
  }).max(500, {
    message: "Announcement must be at most 500 characters.",
  }),
});

// Form schema for template messages
const templateSchema = z.object({
  name: z.string().min(3, {
    message: "Template name must be at least 3 characters.",
  }),
  type: z.enum(["course-reminder", "announcement", "badge-award"], {
    required_error: "Please select a template type",
  }),
  content: z.string().min(10, {
    message: "Template content must be at least 10 characters.",
  }).max(500, {
    message: "Template content must be at most 500 characters.",
  }),
});

// Form schema for channel forwards
const channelForwardSchema = z.object({
  sourceChannelId: z.string().min(1, {
    message: "L'ID de la chaîne source est requis.",
  }),
  sourceChannelName: z.string().min(1, {
    message: "Le nom de la chaîne source est requis.",
  }),
  targetGroupId: z.string().min(1, {
    message: "L'ID du groupe cible est requis.",
  }),
  targetGroupName: z.string().min(1, {
    message: "Le nom du groupe cible est requis.",
  }),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;
type TemplateFormValues = z.infer<typeof templateSchema>;
type ChannelForwardFormValues = z.infer<typeof channelForwardSchema>;

export default function TelegramPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("groups");
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isChannelForwardDialogOpen, setIsChannelForwardDialogOpen] = useState(false);
  const [isExecutingForward, setIsExecutingForward] = useState(false);

  // Fetch Telegram stats
  const { data: telegramStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery<TelegramGroup[]>({
    queryKey: ["/api/telegram/stats"],
  });

  // Fetch courses with Telegram groups
  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Fetch template messages
  const { data: templates, isLoading: isLoadingTemplates, refetch: refetchTemplates } = useQuery<any[]>({
    queryKey: ["/api/templates"],
  });

  // Fetch channel forwards
  const { data: channelForwards, isLoading: isLoadingChannelForwards, refetch: refetchChannelForwards } = useQuery<TelegramChannelForward[]>({
    queryKey: ["/api/telegram/channel-forwards"],
    queryFn: async () => {
      const res = await fetch("/api/telegram/channel-forwards", {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch channel forwards");
      }
      return res.json();
    },
  });

  // Filter courses with Telegram groups
  const coursesWithTelegram = courses?.filter(course => !!course.telegramGroupLink) || [];

  // Create new announcement mutation
  const announcementMutation = useMutation({
    mutationFn: async ({ courseId, content }: AnnouncementFormValues) => {
      const res = await fetch(`/api/courses/${courseId}/telegram/announce`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send announcement");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Announcement sent",
        description: "Your announcement has been sent to the Telegram group.",
      });
      setIsAnnouncementDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error sending announcement",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create template message mutation
  const templateMutation = useMutation({
    mutationFn: async (data: TemplateFormValues) => {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, createdAt: Date.now() }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create template");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template created",
        description: "Your message template has been created successfully.",
      });
      setIsTemplateDialogOpen(false);
      refetchTemplates();
    },
    onError: (error) => {
      toast({
        title: "Error creating template",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for sending announcements
  const announcementForm = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      content: "",
    },
  });

  // Form for creating templates
  const templateForm = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      type: "announcement",
      content: "",
    },
  });

  // Form for creating channel forwards
  const channelForwardForm = useForm<ChannelForwardFormValues>({
    resolver: zodResolver(channelForwardSchema),
    defaultValues: {
      sourceChannelId: "",
      sourceChannelName: "",
      targetGroupId: "",
      targetGroupName: "",
    },
  });

  // Create channel forward mutation
  const channelForwardMutation = useMutation({
    mutationFn: async (data: ChannelForwardFormValues) => {
      const res = await fetch("/api/telegram/channel-forwards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create channel forward");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration créée",
        description: "La configuration de transfert a été créée avec succès.",
      });
      setIsChannelForwardDialogOpen(false);
      refetchChannelForwards();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Execute channel forwards mutation
  const executeForwardsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/telegram/channel-forwards/execute", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to execute channel forwards");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Transferts exécutés",
        description: `${data.transferCount} messages ont été transférés.`,
      });
      refetchChannelForwards();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete channel forward mutation
  const deleteForwardMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/telegram/channel-forwards/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to delete channel forward");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Configuration supprimée",
        description: "La configuration de transfert a été supprimée avec succès.",
      });
      refetchChannelForwards();
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle sending announcement
  const onAnnouncementSubmit = (data: AnnouncementFormValues) => {
    announcementMutation.mutate(data);
  };

  // Handle creating template
  const onTemplateSubmit = (data: TemplateFormValues) => {
    templateMutation.mutate(data);
  };

  // Handle creating channel forward
  const onChannelForwardSubmit = (data: ChannelForwardFormValues) => {
    channelForwardMutation.mutate(data);
  };

  // Handle executing channel forwards
  const handleExecuteForwards = () => {
    setIsExecutingForward(true);
    executeForwardsMutation.mutate(undefined, {
      onSettled: () => {
        setIsExecutingForward(false);
      }
    });
  };

  // Handle deleting channel forward
  const handleDeleteForward = (id: number) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette configuration de transfert ?")) {
      deleteForwardMutation.mutate(id);
    }
  };

  // Handle refreshing Telegram stats
  const handleRefreshStats = () => {
    refetchStats();
    toast({
      title: "Refreshing data",
      description: "Telegram statistics are being updated.",
    });
  };

  // Calculate activity percentage
  const calculateActivity = (messages: number, members: number) => {
    if (members === 0) return 0;
    const maxExpectedMessages = members * 20; // 20 messages per student is 100% activity
    const percentage = (messages / maxExpectedMessages) * 100;
    return Math.min(Math.round(percentage), 100);
  };

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case "bbg":
        return "bg-primary-100 text-primary-700";
      case "abg":
        return "bg-secondary-100 text-secondary-700";
      case "ig":
        return "bg-cyan-100 text-cyan-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Intégration Telegram" />

        {/* Telegram Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="groups">Groupes</TabsTrigger>
                  <TabsTrigger value="templates">Modèles de messages</TabsTrigger>
                  <TabsTrigger value="channels">Transferts de chaîne</TabsTrigger>
                  <TabsTrigger value="settings">Paramètres</TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => window.location.href = '/telegram/test'}>
                    <Info className="mr-2 h-4 w-4" />
                    Tests & Activité
                  </Button>
                  <Button variant="outline" onClick={() => window.location.href = '/telegram/webhook'}>
                    <FaTelegram className="mr-2 h-4 w-4" />
                    Webhook
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    onClick={handleRefreshStats}
                    disabled={isLoadingStats}
                  >
                    {isLoadingStats ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Actualiser les statistiques
                  </Button>

                  <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Send className="mr-2 h-4 w-4" />
                        Envoyer une annonce
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Envoyer une annonce Telegram</DialogTitle>
                        <DialogDescription>
                          Cela enverra un message au groupe Telegram sélectionné.
                        </DialogDescription>
                      </DialogHeader>

                      <Form {...announcementForm}>
                        <form onSubmit={announcementForm.handleSubmit(onAnnouncementSubmit)} className="space-y-4">
                          <FormField
                            control={announcementForm.control}
                            name="courseId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Sélectionner un groupe</FormLabel>
                                <Select
                                  onValueChange={(value) => field.onChange(parseInt(value))}
                                  value={field.value?.toString()}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Sélectionner un groupe" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {coursesWithTelegram.map((course) => (
                                      <SelectItem key={course.id} value={course.id.toString()}>
                                        {course.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={announcementForm.control}
                            name="content"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Annonce</FormLabel>
                                <FormControl>
                                  <Textarea
                                    placeholder="Écrivez votre annonce ici..."
                                    className="min-h-[120px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Vous pouvez utiliser le formatage Markdown dans votre message.
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <DialogFooter>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAnnouncementDialogOpen(false)}
                            >
                              Annuler
                            </Button>
                            <Button
                              type="submit"
                              disabled={announcementMutation.isPending}
                            >
                              {announcementMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Send className="mr-2 h-4 w-4" />
                              )}
                              Envoyer
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Groups Tab */}
              <TabsContent value="groups" className="mt-0">
                <TelegramGroupsManagement />
              </TabsContent>

              {/* Channels Tab */}
              <TabsContent value="channels" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle>Transferts de chaîne Telegram</CardTitle>
                        <CardDescription>
                          Configurez le transfert automatique des messages depuis une chaîne vers un groupe
                        </CardDescription>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          onClick={handleExecuteForwards}
                          disabled={isExecutingForward}
                        >
                          {isExecutingForward ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="mr-2 h-4 w-4" />
                          )}
                          Exécuter les transferts
                        </Button>

                        <Dialog open={isChannelForwardDialogOpen} onOpenChange={setIsChannelForwardDialogOpen}>
                          <DialogTrigger asChild>
                            <Button>
                              <ArrowRightLeft className="mr-2 h-4 w-4" />
                              Nouvelle configuration
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Configurer un transfert de chaîne</DialogTitle>
                              <DialogDescription>
                                Configurez le transfert automatique des messages d'une chaîne vers un groupe Telegram.
                              </DialogDescription>
                            </DialogHeader>

                            <Form {...channelForwardForm}>
                              <form onSubmit={channelForwardForm.handleSubmit(onChannelForwardSubmit)} className="space-y-4">
                                <FormField
                                  control={channelForwardForm.control}
                                  name="sourceChannelId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>ID de la chaîne source</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: @mychannel ou -1001234567890" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={channelForwardForm.control}
                                  name="sourceChannelName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nom de la chaîne source</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: Ma Chaîne d'Annonces" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={channelForwardForm.control}
                                  name="targetGroupId"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>ID du groupe cible</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: -1001234567890" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <FormField
                                  control={channelForwardForm.control}
                                  name="targetGroupName"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Nom du groupe cible</FormLabel>
                                      <FormControl>
                                        <Input placeholder="ex: Groupe des Étudiants" {...field} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <DialogFooter>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsChannelForwardDialogOpen(false)}
                                  >
                                    Annuler
                                  </Button>
                                  <Button
                                    type="submit"
                                    disabled={channelForwardMutation.isPending}
                                  >
                                    {channelForwardMutation.isPending ? (
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                                    )}
                                    Configurer
                                  </Button>
                                </DialogFooter>
                              </form>
                            </Form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoadingChannelForwards ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                      </div>
                    ) : channelForwards && channelForwards.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Chaîne source</TableHead>
                            <TableHead>Groupe cible</TableHead>
                            <TableHead>Statut</TableHead>
                            <TableHead>Dernier transfert</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {channelForwards.map((forward) => (
                            <TableRow key={forward.id}>
                              <TableCell>
                                <div className="font-medium">{forward.sourceChannelName}</div>
                                <div className="text-sm text-gray-500">{forward.sourceChannelId}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{forward.targetGroupName}</div>
                                <div className="text-sm text-gray-500">{forward.targetGroupId}</div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={forward.isActive ? "default" : "secondary"}>
                                  {forward.isActive ? "Actif" : "Inactif"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {forward.lastForwardedAt ? (
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1 text-gray-500" />
                                    <span>{format(new Date(forward.lastForwardedAt), "dd/MM/yyyy HH:mm")}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">Jamais</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteForward(forward.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-4">Aucune configuration de transfert trouvée.</p>
                        <Button
                          variant="outline"
                          onClick={() => setIsChannelForwardDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Ajouter une configuration
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Templates Tab */}
              <TabsContent value="templates" className="mt-0">
                <Card>
                  <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <CardTitle>Modèles de messages</CardTitle>
                        <CardDescription>
                          Créez et gérez des modèles pour différents types de messages
                        </CardDescription>
                      </div>

                      <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Nouveau modèle
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Créer un modèle de message</DialogTitle>
                            <DialogDescription>
                              Créez un modèle réutilisable pour les messages Telegram
                            </DialogDescription>
                          </DialogHeader>

                          <Form {...templateForm}>
                            <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-4">
                              <FormField
                                control={templateForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Nom du modèle</FormLabel>
                                    <FormControl>
                                      <Input placeholder="ex: Rappel de cours" {...field} />
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
                                    <FormLabel>Type de modèle</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Sélectionner un type" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="course-reminder">Rappel de cours</SelectItem>
                                        <SelectItem value="announcement">Annonce</SelectItem>
                                        <SelectItem value="badge-award">Attribution de badge</SelectItem>
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
                                    <FormLabel>Contenu du modèle</FormLabel>
                                    <FormControl>
                                      <Textarea
                                        placeholder="Écrivez votre modèle ici..."
                                        className="min-h-[150px]"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Vous pouvez utiliser des variables comme [Nom du cours], [Nom du prof], etc.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsTemplateDialogOpen(false)}
                                >
                                  Annuler
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={templateMutation.isPending}
                                >
                                  {templateMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Sparkles className="mr-2 h-4 w-4" />
                                  )}
                                  Créer le modèle
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nom du modèle</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Aperçu</TableHead>
                            <TableHead>Créé le</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingTemplates ? (
                            Array.from({ length: 3 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={5} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : templates && templates.length > 0 ? (
                            templates.map((template) => (
                              <TableRow key={template.id}>
                                <TableCell className="font-medium">{template.name}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="capitalize">
                                    {template.type.replace(/-/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {template.content.substring(0, 50)}
                                  {template.content.length > 50 ? '...' : ''}
                                </TableCell>
                                <TableCell>
                                  {format(new Date(template.createdAt), "MMM dd, yyyy")}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm">
                                      Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600">
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                Aucun modèle trouvé. Créez votre premier modèle pour commencer.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Paramètres du Bot Telegram</CardTitle>
                    <CardDescription>
                      Configurez les paramètres d'intégration de votre bot Telegram
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <div className="flex items-start">
                          <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                          <div>
                            <h4 className="text-sm font-medium text-blue-800 mb-1">Configuration du Bot Telegram</h4>
                            <p className="text-sm text-blue-700">
                              Votre bot Telegram est configuré avec le jeton API défini dans les variables d'environnement.
                              Assurez-vous que la variable d'environnement <code>TELEGRAM_BOT_TOKEN</code> est correctement définie.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Statut du bot</p>
                            <p className="text-sm text-gray-500">Statut de connexion de votre bot Telegram</p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                            Connecté
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Modèles de messages</p>
                            <p className="text-sm text-gray-500">Modèles de messages disponibles</p>
                          </div>
                          <Badge variant="outline">{templates ? templates.length : 0} Modèles</Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Groupes connectés</p>
                            <p className="text-sm text-gray-500">Nombre de groupes Telegram connectés</p>
                          </div>
                          <Badge variant="outline">{telegramStats ? telegramStats.length : 0} Groupes</Badge>
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <p className="font-medium">Rappels automatiques</p>
                            <p className="text-sm text-gray-500">Rappels automatiques des cours</p>
                          </div>
                          <Badge variant="outline" className="bg-green-100 text-green-700 hover:bg-green-100">
                            Activé
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Commandes du bot</h3>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Commande</TableHead>
                                <TableHead>Description</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              <TableRow>
                                <TableCell className="font-mono">/start</TableCell>
                                <TableCell>Démarrer l'interaction avec le bot</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono">/help</TableCell>
                                <TableCell>Afficher les commandes disponibles</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono">/info</TableCell>
                                <TableCell>Obtenir des informations sur le cours</TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell className="font-mono">/schedule</TableCell>
                                <TableCell>Voir les prochains cours</TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
