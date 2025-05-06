import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isBefore, addDays, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks } from 'date-fns';
import { fr } from 'date-fns/locale';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight, Link, Trash, Edit, MoreHorizontal, Filter, RefreshCw, CheckCircle, XCircle, Video, CalendarDays, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// Types
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

interface DynamicSchedule {
  id: number;
  fixedScheduleId: number;
  courseName: string;
  level: string;
  teacherName: string;
  scheduledDate: number; // timestamp
  scheduledTime: string;
  duration: number;
  zoomMeetingId: string;
  zoomMeetingUrl: string;
  status: string;
  telegramGroup: string;
  createdAt: number;
}

interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  course: string;
  teacher: string;
  level: string;
  status: string;
  zoomUrl?: string;
  fixedScheduleId: number;
  zoomMeetingId?: string;
  telegramGroup?: string;
}

// Fonction pour convertir les niveaux en libellés
function getLevelLabel(level: string): string {
  const levels: Record<string, string> = {
    'bbg': 'BBG',
    'abg': 'ABG',
    'ig': 'IG',
    'a1': 'BBG',
    'a2': 'BBG',
    'b1': 'ABG',
    'b2': 'ABG',
    'c1': 'IG',
    'c2': 'IG'
  };
  return levels[level.toLowerCase()] || level;
}

// Composant principal du planning dynamique
export function DynamicScheduleView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  // États
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    level: 'all',
    teacher: 'all',
    status: 'all'
  });
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);

  // Aucune donnée de coach
  const realCoaches: string[] = [];

  // Aucune donnée de niveau
  const realLevels: string[] = [];

  // Calculer les dates de début et de fin de la semaine
  const weekStart = useMemo(() => {
    return startOfWeek(currentWeek, { weekStartsOn: 1 }); // Semaine commence le lundi
  }, [currentWeek]);

  const weekEnd = useMemo(() => {
    return endOfWeek(currentWeek, { weekStartsOn: 1 });
  }, [currentWeek]);

  // Récupérer le planning dynamique
  const { data: dynamicSchedule, isLoading: isLoadingSchedule } = useQuery<DynamicSchedule[]>({
    queryKey: ['/api/dynamic-schedule', weekStart.getTime(), weekEnd.getTime()],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/dynamic-schedule?start=${weekStart.getTime()}&end=${weekEnd.getTime()}`);
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la récupération du planning dynamique:', error);
        return [];
      }
    }
  });

  // Mutation pour générer le planning dynamique
  const generateScheduleMutation = useMutation({
    mutationFn: async (weekStartDate: number) => {
      try {
        const res = await apiRequest('POST', '/api/dynamic-schedule/generate', { weekStart: weekStartDate });
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la génération du planning dynamique:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-schedule'] });
      toast({
        title: 'Planning généré',
        description: 'Le planning dynamique a été généré avec succès pour la semaine sélectionnée',
      });
      setIsGenerateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la génération du planning: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour créer une réunion Zoom
  const createZoomMutation = useMutation({
    mutationFn: async (scheduleId: number) => {
      try {
        const res = await apiRequest('POST', `/api/dynamic-schedule/${scheduleId}/zoom`);
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la création de la réunion Zoom:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-schedule'] });
      toast({
        title: 'Réunion Zoom créée',
        description: 'La réunion Zoom a été créée avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la création de la réunion Zoom: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour créer des réunions Zoom en masse
  const createBulkZoomMutation = useMutation({
    mutationFn: async (scheduleIds: number[]) => {
      try {
        const res = await apiRequest('POST', '/api/dynamic-schedule/bulk-zoom', { scheduleIds });
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la création des réunions Zoom en masse:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dynamic-schedule'] });
      setSelectedEvents([]);
      toast({
        title: 'Réunions Zoom créées',
        description: 'Les réunions Zoom ont été créées avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la création des réunions Zoom: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Aucun événement fictif
  const realCalendarEvents = useMemo(() => {
    return [] as CalendarEvent[];
  }, []);

  // Générer les événements du calendrier
  const apiEvents = useMemo(() => {
    if (!dynamicSchedule) return [];

    const calendarEvents: CalendarEvent[] = [];

    // Pour chaque cours du planning dynamique
    dynamicSchedule.forEach(schedule => {
      // Créer la date de début
      const startDate = new Date(schedule.scheduledDate);
      const [hours, minutes] = schedule.scheduledTime.split(':').map(Number);
      startDate.setHours(hours, minutes, 0, 0);

      // Créer la date de fin
      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + schedule.duration);

      // Créer l'événement
      calendarEvents.push({
        id: schedule.id,
        title: `${schedule.courseName} - ${schedule.teacherName}`,
        start: startDate,
        end: endDate,
        course: schedule.courseName,
        teacher: schedule.teacherName,
        level: schedule.level,
        status: schedule.zoomMeetingId ? 'scheduled' : 'pending',
        zoomUrl: schedule.zoomMeetingUrl,
        fixedScheduleId: schedule.fixedScheduleId,
        zoomMeetingId: schedule.zoomMeetingId,
        telegramGroup: schedule.telegramGroup
      });
    });

    return calendarEvents;
  }, [dynamicSchedule]);

  // Utiliser uniquement les données de l'API
  const events = apiEvents;

  // Filtrer les événements
  const filteredEvents = events.filter(event => {
    // Filtre de recherche
    if (searchTerm && !event.title.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Filtre de niveau
    if (filters.level !== 'all') {
      const eventLevel = event.level.toLowerCase();
      const filterLevel = filters.level.toLowerCase();

      // Vérifier si le niveau correspond directement
      if (eventLevel === filterLevel) {
        // OK, le niveau correspond directement
      }
      // Vérifier les équivalences
      else if (filterLevel === 'bbg' && (eventLevel === 'a1' || eventLevel === 'a2')) {
        // OK, niveau équivalent à BBG
      }
      else if (filterLevel === 'abg' && (eventLevel === 'b1' || eventLevel === 'b2')) {
        // OK, niveau équivalent à ABG
      }
      else if (filterLevel === 'ig' && (eventLevel === 'c1' || eventLevel === 'c2')) {
        // OK, niveau équivalent à IG
      }
      else {
        return false; // Le niveau ne correspond pas
      }
    }

    // Filtre de professeur
    if (filters.teacher !== 'all' && event.teacher !== filters.teacher) {
      return false;
    }

    // Filtre de statut
    if (filters.status !== 'all' && event.status !== filters.status) {
      return false;
    }

    return true;
  });

  // Obtenir les jours de la semaine actuelle
  const weekDays = useMemo(() => {
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [weekStart, weekEnd]);



  // Récupérer les métadonnées (coachs et niveaux)
  const { data: metadata } = useQuery<{ coaches: string[], levels: string[] }>({
    queryKey: ['/api/metadata'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/metadata');
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la récupération des métadonnées:', error);
        return { coaches: [], levels: [] };
      }
    }
  });

  // Obtenir les options de filtrage
  const filterOptions = useMemo(() => {
    // Récupérer les professeurs depuis les événements
    const teachersFromEvents = events ? Array.from(new Set(events.map(event => event.teacher))) : [];

    // Récupérer les professeurs depuis les métadonnées
    const teachersFromMetadata = metadata?.coaches || [];

    // Utiliser uniquement les données de l'API
    const teachersToUse = teachersFromEvents.length > 0 ? teachersFromEvents :
                         (teachersFromMetadata.length > 0 ? teachersFromMetadata : []);

    // Trier les professeurs par ordre alphabétique
    teachersToUse.sort();

    return { teachers: teachersToUse };
  }, [events, metadata, realCoaches]);

  // Gérer la sélection/désélection d'un événement
  const toggleEventSelection = (eventId: number) => {
    setSelectedEvents(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  // Gérer la sélection/désélection de tous les événements
  const toggleAllEvents = () => {
    if (selectedEvents.length === filteredEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(filteredEvents.map(event => event.id));
    }
  };

  // Créer des réunions Zoom pour les événements sélectionnés
  const createZoomForSelected = () => {
    if (selectedEvents.length === 0) return;

    createBulkZoomMutation.mutate(selectedEvents);
  };

  // Générer le planning pour la semaine sélectionnée
  const generateScheduleForWeek = () => {
    generateScheduleMutation.mutate(weekStart.getTime());
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-bold">Planning Dynamique</CardTitle>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFilterDialogOpen(true)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtres
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/dynamic-schedule'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>

            {isAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={() => setIsGenerateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Générer Planning
              </Button>
            )}

            {selectedEvents.length > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={createZoomForSelected}
                disabled={createBulkZoomMutation.isPending}
              >
                {createBulkZoomMutation.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Video className="h-4 w-4 mr-2" />
                    Créer {selectedEvents.length} réunion(s) Zoom
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(prev => addWeeks(prev, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="font-medium">
              Semaine du {format(weekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeek(prev => addWeeks(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeek(new Date())}
            >
              Semaine actuelle
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Input
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-40 sm:w-60"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoadingSchedule ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Vue hebdomadaire */}
            <div className="grid grid-cols-7 gap-2">
              {/* En-têtes des jours */}
              {weekDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-2 text-center font-medium ${
                    isToday(day) ? 'bg-primary/10 rounded-md' : ''
                  }`}
                >
                  <div>{format(day, 'EEEE', { locale: fr })}</div>
                  <div className={`text-lg ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                    {format(day, 'd', { locale: fr })}
                  </div>
                </div>
              ))}

              {/* Cellules des événements */}
              {weekDays.map((day, dayIndex) => (
                <div
                  key={`cell-${dayIndex}`}
                  className={`border rounded-md p-2 min-h-[150px] ${
                    isToday(day) ? 'bg-primary/5' : ''
                  }`}
                >
                  {filteredEvents
                    .filter(event =>
                      event.start.getDate() === day.getDate() &&
                      event.start.getMonth() === day.getMonth() &&
                      event.start.getFullYear() === day.getFullYear()
                    )
                    .map(event => (
                      <div
                        key={`event-${event.id}`}
                        className={`mb-2 p-2 rounded-md ${
                          event.status === 'scheduled'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-yellow-50 border border-yellow-200'
                        } ${
                          selectedEvents.includes(event.id)
                            ? 'ring-2 ring-primary'
                            : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedEvents.includes(event.id)}
                              onCheckedChange={() => toggleEventSelection(event.id)}
                            />
                            <span className="font-medium">{event.course}</span>
                          </div>

                          <Badge variant="outline" className="text-xs">
                            {getLevelLabel(event.level)}
                          </Badge>
                        </div>

                        <div className="mt-1 text-sm text-gray-600">
                          {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                        </div>

                        <div className="mt-1 text-sm flex items-center justify-between">
                          <span>{event.teacher}</span>
                          {event.telegramGroup && (
                            <a
                              href={`https://t.me/c/${event.telegramGroup.replace('-100', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-600 hover:underline flex items-center"
                            >
                              <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm.375 16.5h-2.25v-4.5h-2.25V9.75h4.5v6.75zm0-9h-2.25V5.25h2.25v2.25z" />
                              </svg>
                              Telegram
                            </a>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          {event.status === 'scheduled' ? (
                            <a
                              href={event.zoomUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center"
                            >
                              <Link className="h-3 w-3 mr-1" />
                              Lien Zoom
                            </a>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs h-6 px-2"
                              onClick={() => createZoomMutation.mutate(event.id)}
                              disabled={createZoomMutation.isPending}
                            >
                              {createZoomMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <>
                                  <Video className="h-3 w-3 mr-1" />
                                  Créer Zoom
                                </>
                              )}
                            </Button>
                          )}

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  // Implémenter l'édition
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  // Implémenter l'envoi de message Telegram
                                }}
                              >
                                <Link className="h-4 w-4 mr-2" />
                                Envoyer message
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Dialogue de filtrage */}
      <Dialog open={isFilterDialogOpen} onOpenChange={setIsFilterDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filtrer les cours</DialogTitle>
            <DialogDescription>
              Sélectionnez les critères de filtrage pour afficher les cours correspondants.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="level-filter">Niveau</Label>
              <Select
                value={filters.level}
                onValueChange={(value) => setFilters(prev => ({ ...prev, level: value }))}
              >
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

            <div className="space-y-2">
              <Label htmlFor="teacher-filter">Professeur</Label>
              <Select
                value={filters.teacher}
                onValueChange={(value) => setFilters(prev => ({ ...prev, teacher: value }))}
              >
                <SelectTrigger id="teacher-filter">
                  <SelectValue placeholder="Tous les professeurs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les professeurs</SelectItem>
                  {filterOptions.teachers.map(teacher => (
                    <SelectItem key={teacher} value={teacher}>
                      {teacher}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Statut</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="scheduled">Programmé avec Zoom</SelectItem>
                  <SelectItem value="pending">En attente de Zoom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFilters({ level: 'all', teacher: 'all', status: 'all' })}
            >
              Réinitialiser
            </Button>
            <Button onClick={() => setIsFilterDialogOpen(false)}>
              Appliquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogue de génération de planning */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer le planning</DialogTitle>
            <DialogDescription>
              Générer le planning dynamique pour la semaine du {format(weekStart, 'd MMMM', { locale: fr })} au {format(weekEnd, 'd MMMM yyyy', { locale: fr })}.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-500">
              Cette action va créer des entrées dans le planning dynamique pour tous les cours du planning fixe pour la semaine sélectionnée.
              Les réunions Zoom ne seront pas créées automatiquement.
            </p>

            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              <p className="text-sm font-medium text-yellow-800">
                Attention : Cette action remplacera toutes les entrées existantes pour cette semaine.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGenerateDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={generateScheduleForWeek}
              disabled={generateScheduleMutation.isPending}
            >
              {generateScheduleMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                'Générer le planning'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
