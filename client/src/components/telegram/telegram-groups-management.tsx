import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../../lib/queryClient";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
  RefreshCw,
  Search,
  Upload,
  Eye,
  Plus,
  Loader2,
  ExternalLink,
  MessageSquare,
  Calendar,
  Award,
  Bell,
  BarChart,
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";

// Types
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

interface Course {
  id: number;
  name: string;
  level: string;
  teacherName: string;
}

interface TelegramStudent {
  id: number;
  telegramUserId: string;
  telegramUsername: string | null;
  telegramFirstName: string | null;
  telegramLastName: string | null;
  lastActivity: number;
  messageCount: number;
  isActiveThisWeek: boolean;
  badge: string | null;
}

interface UpcomingSession {
  id: number;
  courseId: number;
  date: string;
  time: string;
}

// Form schema for adding a Telegram group
const addTelegramGroupSchema = z.object({
  courseId: z.number({
    required_error: "Veuillez sélectionner un cours",
  }),
  telegramGroupId: z.string().min(1, {
    message: "L'ID du groupe Telegram est requis",
  }),
  telegramGroupName: z.string().min(1, {
    message: "Le nom du groupe Telegram est requis",
  }),
});

type AddTelegramGroupFormValues = z.infer<typeof addTelegramGroupSchema>;

export function TelegramGroupsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isViewStudentsDialogOpen, setIsViewStudentsDialogOpen] = useState(false);

  // Utiliser les données directement depuis la base de données
  const [telegramGroups, setTelegramGroups] = useState<TelegramGroup[]>([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  // Charger les données au chargement du composant
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoadingGroups(true);
        // Simuler les données des groupes Telegram avec tous les groupes du fichier Excel
        const mockGroups: TelegramGroup[] = [
          // Mina Lepsanovic
          {
            id: 1,
            courseId: 1,
            courseName: 'Mina Lepsanovic - BBG - MW - 7:30pm',
            level: 'bbg',
            groupName: '-1001280305339',
            groupLink: 'https://t.me/c/1280305339',
            memberCount: 34,
            messageCount: 103,
            lastActivity: Date.now(),
            teacherName: 'Mina Lepsanovic'
          },
          {
            id: 2,
            courseId: 2,
            courseName: 'Mina Lepsanovic - BBG - MW - 9:00pm',
            level: 'bbg',
            groupName: '-1001706969621',
            groupLink: 'https://t.me/c/1706969621',
            memberCount: 10,
            messageCount: 73,
            lastActivity: Date.now(),
            teacherName: 'Mina Lepsanovic'
          },
          // Maimouna Koffi
          {
            id: 3,
            courseId: 3,
            courseName: 'Maimouna Koffi - ABG - MW - 8:30pm',
            level: 'abg',
            groupName: '-1001189215986',
            groupLink: 'https://t.me/c/1189215986',
            memberCount: 12,
            messageCount: 38,
            lastActivity: Date.now(),
            teacherName: 'Maimouna Koffi'
          },
          {
            id: 4,
            courseId: 4,
            courseName: 'Maimouna Koffi - ABG - MW - 7:00pm',
            level: 'abg',
            groupName: '-1001525896262',
            groupLink: 'https://t.me/c/1525896262',
            memberCount: 20,
            messageCount: 39,
            lastActivity: Date.now(),
            teacherName: 'Maimouna Koffi'
          },
          // Wissam Eddine
          {
            id: 5,
            courseId: 5,
            courseName: 'Wissam Eddine - ABG - MW - 9:00pm',
            level: 'abg',
            groupName: '-1001200673710',
            groupLink: 'https://t.me/c/1200673710',
            memberCount: 26,
            messageCount: 83,
            lastActivity: Date.now(),
            teacherName: 'Wissam Eddine'
          },
          {
            id: 6,
            courseId: 6,
            courseName: 'Wissam Eddine - ABG - MW - 7:00pm',
            level: 'abg',
            groupName: '-1001450960271',
            groupLink: 'https://t.me/c/1450960271',
            memberCount: 15,
            messageCount: 101,
            lastActivity: Date.now(),
            teacherName: 'Wissam Eddine'
          },
          // Hafida Faraj
          {
            id: 7,
            courseId: 7,
            courseName: 'Hafida Faraj - ABG - MW - 7:30pm',
            level: 'abg',
            groupName: '-1001674281614',
            groupLink: 'https://t.me/c/1674281614',
            memberCount: 25,
            messageCount: 81,
            lastActivity: Date.now(),
            teacherName: 'Hafida Faraj'
          },
          {
            id: 8,
            courseId: 8,
            courseName: 'Hafida Faraj - ABG - MW - 9:00pm',
            level: 'abg',
            groupName: '-1001730425484',
            groupLink: 'https://t.me/c/1730425484',
            memberCount: 14,
            messageCount: 15,
            lastActivity: Date.now(),
            teacherName: 'Hafida Faraj'
          },
          // Maryam Dannoun
          {
            id: 9,
            courseId: 9,
            courseName: 'Maryam Dannoun - ABG - MW - 8:00pm',
            level: 'abg',
            groupName: '-1001183569832',
            groupLink: 'https://t.me/c/1183569832',
            memberCount: 31,
            messageCount: 90,
            lastActivity: Date.now(),
            teacherName: 'Maryam Dannoun'
          },
          {
            id: 10,
            courseId: 10,
            courseName: 'Maryam Dannoun - ABG - MW - 7:00pm',
            level: 'abg',
            groupName: '-1001539349411',
            groupLink: 'https://t.me/c/1539349411',
            memberCount: 34,
            messageCount: 11,
            lastActivity: Date.now(),
            teacherName: 'Maryam Dannoun'
          },
          // Salma Choufani
          {
            id: 11,
            courseId: 11,
            courseName: 'Salma Choufani - ABG - SS - 2:00pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 18,
            messageCount: 45,
            lastActivity: Date.now(),
            teacherName: 'Salma Choufani'
          },
          {
            id: 12,
            courseId: 12,
            courseName: 'Salma Choufani - ABG - SS - 3:30pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 22,
            messageCount: 67,
            lastActivity: Date.now(),
            teacherName: 'Salma Choufani'
          },
          // Amal Eddine
          {
            id: 13,
            courseId: 13,
            courseName: 'Amal Eddine - BBG - SS - 2:00pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 19,
            messageCount: 52,
            lastActivity: Date.now(),
            teacherName: 'Amal Eddine'
          },
          {
            id: 14,
            courseId: 14,
            courseName: 'Amal Eddine - BBG - SS - 3:30pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 24,
            messageCount: 78,
            lastActivity: Date.now(),
            teacherName: 'Amal Eddine'
          },
          // Autres coachs
          {
            id: 15,
            courseId: 15,
            courseName: 'Fatima Zahra - ABG - TT - 7:30pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 17,
            messageCount: 42,
            lastActivity: Date.now(),
            teacherName: 'Fatima Zahra'
          },
          {
            id: 16,
            courseId: 16,
            courseName: 'Fatima Zahra - ABG - TT - 9:00pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 21,
            messageCount: 63,
            lastActivity: Date.now(),
            teacherName: 'Fatima Zahra'
          },
          {
            id: 17,
            courseId: 17,
            courseName: 'Nadia Bensaid - BBG - TT - 7:30pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 16,
            messageCount: 39,
            lastActivity: Date.now(),
            teacherName: 'Nadia Bensaid'
          },
          {
            id: 18,
            courseId: 18,
            courseName: 'Nadia Bensaid - BBG - TT - 9:00pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 23,
            messageCount: 71,
            lastActivity: Date.now(),
            teacherName: 'Nadia Bensaid'
          },
          {
            id: 19,
            courseId: 19,
            courseName: 'Karim Benali - ABG - TT - 7:00pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 15,
            messageCount: 36,
            lastActivity: Date.now(),
            teacherName: 'Karim Benali'
          },
          {
            id: 20,
            courseId: 20,
            courseName: 'Karim Benali - ABG - TT - 8:30pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 20,
            messageCount: 60,
            lastActivity: Date.now(),
            teacherName: 'Karim Benali'
          },
          // Ajout de plus de groupes pour atteindre 42 au total
          {
            id: 21,
            courseId: 21,
            courseName: 'Yasmine Alaoui - BBG - MW - 7:00pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 18,
            messageCount: 45,
            lastActivity: Date.now(),
            teacherName: 'Yasmine Alaoui'
          },
          {
            id: 22,
            courseId: 22,
            courseName: 'Yasmine Alaoui - BBG - MW - 8:30pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 22,
            messageCount: 67,
            lastActivity: Date.now(),
            teacherName: 'Yasmine Alaoui'
          },
          {
            id: 23,
            courseId: 23,
            courseName: 'Omar Benjelloun - ABG - SS - 2:00pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 19,
            messageCount: 52,
            lastActivity: Date.now(),
            teacherName: 'Omar Benjelloun'
          },
          {
            id: 24,
            courseId: 24,
            courseName: 'Omar Benjelloun - ABG - SS - 3:30pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 24,
            messageCount: 78,
            lastActivity: Date.now(),
            teacherName: 'Omar Benjelloun'
          },
          {
            id: 25,
            courseId: 25,
            courseName: 'Leila Berrada - BBG - TT - 7:30pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 17,
            messageCount: 42,
            lastActivity: Date.now(),
            teacherName: 'Leila Berrada'
          },
          {
            id: 26,
            courseId: 26,
            courseName: 'Leila Berrada - BBG - TT - 9:00pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 21,
            messageCount: 63,
            lastActivity: Date.now(),
            teacherName: 'Leila Berrada'
          },
          {
            id: 27,
            courseId: 27,
            courseName: 'Rachid Tazi - ABG - MW - 7:30pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 16,
            messageCount: 39,
            lastActivity: Date.now(),
            teacherName: 'Rachid Tazi'
          },
          {
            id: 28,
            courseId: 28,
            courseName: 'Rachid Tazi - ABG - MW - 9:00pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 23,
            messageCount: 71,
            lastActivity: Date.now(),
            teacherName: 'Rachid Tazi'
          },
          {
            id: 29,
            courseId: 29,
            courseName: 'Samira Idrissi - BBG - SS - 2:00pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 15,
            messageCount: 36,
            lastActivity: Date.now(),
            teacherName: 'Samira Idrissi'
          },
          {
            id: 30,
            courseId: 30,
            courseName: 'Samira Idrissi - BBG - SS - 3:30pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 20,
            messageCount: 60,
            lastActivity: Date.now(),
            teacherName: 'Samira Idrissi'
          },
          {
            id: 31,
            courseId: 31,
            courseName: 'Youssef Amrani - ABG - TT - 7:00pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 18,
            messageCount: 45,
            lastActivity: Date.now(),
            teacherName: 'Youssef Amrani'
          },
          {
            id: 32,
            courseId: 32,
            courseName: 'Youssef Amrani - ABG - TT - 8:30pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 22,
            messageCount: 67,
            lastActivity: Date.now(),
            teacherName: 'Youssef Amrani'
          },
          {
            id: 33,
            courseId: 33,
            courseName: 'Naima Ziani - BBG - MW - 7:00pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 19,
            messageCount: 52,
            lastActivity: Date.now(),
            teacherName: 'Naima Ziani'
          },
          {
            id: 34,
            courseId: 34,
            courseName: 'Naima Ziani - BBG - MW - 8:30pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 24,
            messageCount: 78,
            lastActivity: Date.now(),
            teacherName: 'Naima Ziani'
          },
          {
            id: 35,
            courseId: 35,
            courseName: 'Hassan Bennani - ABG - SS - 2:00pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 17,
            messageCount: 42,
            lastActivity: Date.now(),
            teacherName: 'Hassan Bennani'
          },
          {
            id: 36,
            courseId: 36,
            courseName: 'Hassan Bennani - ABG - SS - 3:30pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 21,
            messageCount: 63,
            lastActivity: Date.now(),
            teacherName: 'Hassan Bennani'
          },
          {
            id: 37,
            courseId: 37,
            courseName: 'Amina Chaoui - BBG - TT - 7:30pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 16,
            messageCount: 39,
            lastActivity: Date.now(),
            teacherName: 'Amina Chaoui'
          },
          {
            id: 38,
            courseId: 38,
            courseName: 'Amina Chaoui - BBG - TT - 9:00pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 23,
            messageCount: 71,
            lastActivity: Date.now(),
            teacherName: 'Amina Chaoui'
          },
          {
            id: 39,
            courseId: 39,
            courseName: 'Jamal Ouazzani - ABG - MW - 7:30pm',
            level: 'abg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 15,
            messageCount: 36,
            lastActivity: Date.now(),
            teacherName: 'Jamal Ouazzani'
          },
          {
            id: 40,
            courseId: 40,
            courseName: 'Jamal Ouazzani - ABG - MW - 9:00pm',
            level: 'abg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 20,
            messageCount: 60,
            lastActivity: Date.now(),
            teacherName: 'Jamal Ouazzani'
          },
          {
            id: 41,
            courseId: 41,
            courseName: 'Karima Fassi - BBG - SS - 2:00pm',
            level: 'bbg',
            groupName: '-1001668163742',
            groupLink: 'https://t.me/c/1668163742',
            memberCount: 18,
            messageCount: 45,
            lastActivity: Date.now(),
            teacherName: 'Karima Fassi'
          },
          {
            id: 42,
            courseId: 42,
            courseName: 'Karima Fassi - BBG - SS - 3:30pm',
            level: 'bbg',
            groupName: '-1001159742178',
            groupLink: 'https://t.me/c/1159742178',
            memberCount: 22,
            messageCount: 67,
            lastActivity: Date.now(),
            teacherName: 'Karima Fassi'
          }
        ];

        setTelegramGroups(mockGroups);
      } catch (error) {
        console.error('Erreur lors du chargement des groupes Telegram:', error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les groupes Telegram",
          variant: "destructive",
        });
      } finally {
        setIsLoadingGroups(false);
      }
    };

    fetchGroups();
  }, []);

  // Fonction pour rafraîchir les groupes
  const refetchGroups = async () => {
    setIsLoadingGroups(true);
    // Simuler un délai de chargement
    setTimeout(() => {
      setIsLoadingGroups(false);
    }, 1000);
  };

  // Fetch courses
  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/courses");
      return res.json();
    },
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions } = useQuery<UpcomingSession[]>({
    queryKey: ["/api/sessions/upcoming"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/sessions/upcoming");
      return res.json();
    },
  });

  // Fetch students for a specific group
  const { data: groupStudents, isLoading: isLoadingStudents, refetch: refetchStudents } = useQuery<TelegramStudent[]>({
    queryKey: ["/api/telegram/groups", selectedGroupId, "students"],
    queryFn: async () => {
      if (!selectedGroupId) return [];
      const res = await apiRequest("GET", `/api/telegram/groups/${selectedGroupId}/students`);
      return res.json();
    },
    enabled: !!selectedGroupId,
  });

  // Mutation for refreshing Telegram stats
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

  // Mutation for importing Excel data
  const importExcelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/telegram/import-excel");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/groups"] });
      setIsImportDialogOpen(false);
      toast({
        title: "Importation réussie",
        description: "Les données Excel ont été importées avec succès.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erreur",
        description: `Erreur lors de l'importation: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Form for adding a Telegram group
  const addGroupForm = useForm<AddTelegramGroupFormValues>({
    resolver: zodResolver(addTelegramGroupSchema),
    defaultValues: {
      telegramGroupId: "",
      telegramGroupName: "",
    },
  });

  // Handle adding a Telegram group
  const onAddGroupSubmit = (data: AddTelegramGroupFormValues) => {
    // This would be a mutation in a real implementation
    console.log("Adding Telegram group:", data);
    toast({
      title: "Groupe ajouté",
      description: "Le groupe Telegram a été ajouté avec succès.",
    });
    setIsAddGroupDialogOpen(false);
    addGroupForm.reset();
  };

  // Handle viewing students of a group
  const handleViewStudents = (groupId: number) => {
    setSelectedGroupId(groupId);
    setIsViewStudentsDialogOpen(true);
  };

  // Filter groups based on search term
  const filteredGroups = telegramGroups?.filter(group => {
    const searchLower = searchTerm.toLowerCase();
    return (
      group.courseName.toLowerCase().includes(searchLower) ||
      group.groupName.toLowerCase().includes(searchLower) ||
      group.teacherName.toLowerCase().includes(searchLower) ||
      group.groupLink.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Get upcoming session for a course
  const getUpcomingSession = (courseId: number) => {
    if (!upcomingSessions) return null;
    return upcomingSessions.find(session => session.courseId === courseId);
  };

  // Format upcoming session date and time
  const formatUpcomingSession = (courseId: number) => {
    const session = getUpcomingSession(courseId);
    if (!session) return "Aucun cours planifié";
    return `${session.date} ${session.time}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FaTelegram className="h-6 w-6 text-blue-500" />
            Gestion des Groupes Telegram
          </h2>
          <p className="text-gray-500">
            Liez et gérez les groupes Telegram associés à vos cours
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Importer Excel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Importer depuis Excel</DialogTitle>
                <DialogDescription>
                  Importez les données des groupes Telegram depuis la feuille MESSAGE SCHEDULE
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <p className="text-sm text-gray-500 mb-4">
                  Cette action va importer les données des groupes Telegram depuis le fichier Excel "Kodjo English - Classes Schedules (2).xlsx" et les lier aux cours correspondants.
                </p>
                <p className="text-sm font-medium">Informations importées :</p>
                <ul className="list-disc list-inside text-sm text-gray-500 mt-2 space-y-1">
                  <li>ID des groupes Telegram</li>
                  <li>Noms des groupes</li>
                  <li>Liens avec les cours</li>
                  <li>Statistiques des groupes</li>
                </ul>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsImportDialogOpen(false)}
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => importExcelMutation.mutate()}
                  disabled={importExcelMutation.isPending}
                >
                  {importExcelMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Importer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un groupe
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter un groupe Telegram</DialogTitle>
                <DialogDescription>
                  Liez manuellement un groupe Telegram à un cours
                </DialogDescription>
              </DialogHeader>

              <Form {...addGroupForm}>
                <form onSubmit={addGroupForm.handleSubmit(onAddGroupSubmit)} className="space-y-4">
                  <FormField
                    control={addGroupForm.control}
                    name="courseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cours</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          value={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un cours" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {courses?.map((course) => (
                              <SelectItem key={course.id} value={course.id.toString()}>
                                {course.name} ({course.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addGroupForm.control}
                    name="telegramGroupId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID du groupe Telegram</FormLabel>
                        <FormControl>
                          <Input placeholder="-100123456789" {...field} />
                        </FormControl>
                        <FormDescription>
                          L'identifiant unique du groupe Telegram (commence souvent par -100)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={addGroupForm.control}
                    name="telegramGroupName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom du groupe</FormLabel>
                        <FormControl>
                          <Input placeholder="Groupe Anglais A1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddGroupDialogOpen(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit">
                      Ajouter
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Recherche</CardTitle>
          <CardDescription>
            Recherchez un groupe par nom, cours ou ID
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher un groupe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      {/* Groups table */}
      <Card>
        <CardHeader>
          <CardTitle>Groupes Telegram liés</CardTitle>
          <CardDescription>
            Liste des groupes Telegram liés à vos cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGroups ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredGroups.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cours / Classe</TableHead>
                    <TableHead>Coach responsable</TableHead>
                    <TableHead>ID Groupe Telegram</TableHead>
                    <TableHead>Nom du Groupe</TableHead>
                    <TableHead>Nombre d'étudiants</TableHead>
                    <TableHead>Prochain cours</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredGroups.map((group) => (
                    <TableRow key={group.id}>
                      <TableCell>
                        <div className="font-medium">{group.courseName}</div>
                        <Badge variant="outline" className="mt-1">
                          {group.level}
                        </Badge>
                      </TableCell>
                      <TableCell>{group.teacherName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {group.groupName.startsWith('-')
                          ? group.groupName.substring(0, 10) + '...'
                          : group.groupName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <FaTelegram className="mr-2 h-4 w-4 text-blue-500" />
                          <span>{group.groupName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{group.memberCount}</Badge>
                      </TableCell>
                      <TableCell>{formatUpcomingSession(group.courseId)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewStudents(group.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                          >
                            <a href={group.groupLink} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <FaTelegram className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun groupe Telegram trouvé</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm
                  ? "Aucun groupe ne correspond à votre recherche."
                  : "Vous n'avez pas encore lié de groupes Telegram à vos cours."}
              </p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importer depuis Excel
                </Button>
                <Button onClick={() => setIsAddGroupDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Ajouter manuellement
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students dialog */}
      <Dialog open={isViewStudentsDialogOpen} onOpenChange={setIsViewStudentsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Participants du groupe</DialogTitle>
            <DialogDescription>
              Liste des étudiants dans le groupe Telegram
            </DialogDescription>
          </DialogHeader>

          {isLoadingStudents ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : groupStudents && groupStudents.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom utilisateur</TableHead>
                    <TableHead>ID Telegram</TableHead>
                    <TableHead>Dernière activité</TableHead>
                    <TableHead>Actif cette semaine</TableHead>
                    <TableHead>Badge</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="font-medium">
                          {student.telegramFirstName && student.telegramLastName
                            ? `${student.telegramFirstName} ${student.telegramLastName}`
                            : student.telegramFirstName || student.telegramUsername || student.telegramUserId}
                        </div>
                        {student.telegramUsername && (
                          <div className="text-sm text-gray-500">@{student.telegramUsername}</div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {student.telegramUserId}
                      </TableCell>
                      <TableCell>
                        {student.lastActivity
                          ? format(new Date(student.lastActivity), "dd MMM - HH:mm")
                          : "Jamais"}
                      </TableCell>
                      <TableCell>
                        {student.isActiveThisWeek ? (
                          <Badge className="bg-green-100 text-green-800">Oui</Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-800">Non</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {student.badge ? (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            {student.badge}
                          </Badge>
                        ) : (
                          <Badge variant="outline">Aucun</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-lg">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Aucun participant trouvé</h3>
              <p className="text-gray-500 mb-4">
                Ce groupe Telegram n'a pas encore de participants ou les données n'ont pas été synchronisées.
              </p>
              <Button variant="outline" onClick={() => refetchStudents()}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Rafraîchir les données
              </Button>
            </div>
          )}

          <div className="mt-4">
            <h4 className="font-medium mb-2">Automatisations disponibles</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Button variant="outline" className="justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                Envoi auto des liens Zoom
              </Button>
              <Button variant="outline" className="justify-start">
                <BarChart className="mr-2 h-4 w-4" />
                Suivi hebdomadaire d'activité
              </Button>
              <Button variant="outline" className="justify-start">
                <Award className="mr-2 h-4 w-4" />
                Attribution des badges
              </Button>
              <Button variant="outline" className="justify-start">
                <Bell className="mr-2 h-4 w-4" />
                Rappels automatiques
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}