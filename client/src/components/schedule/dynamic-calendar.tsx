import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isBefore, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, ChevronLeft, ChevronRight, Link, Trash, Edit, MoreHorizontal, Filter, RefreshCw, CheckCircle, XCircle, Video } from 'lucide-react';
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

interface ZoomMeeting {
  id: number;
  fixedScheduleId: number;
  zoomMeetingId: string;
  zoomMeetingUrl: string;
  startTime: number;
  status: string;
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
}

// Fonction pour convertir les jours de la semaine en français
function getDayName(day: string): string {
  const days: Record<string, string> = {
    'monday': 'Lundi',
    'tuesday': 'Mardi',
    'wednesday': 'Mercredi',
    'thursday': 'Jeudi',
    'friday': 'Vendredi',
    'saturday': 'Samedi',
    'sunday': 'Dimanche',
    'lundi': 'Lundi',
    'mardi': 'Mardi',
    'mercredi': 'Mercredi',
    'jeudi': 'Jeudi',
    'vendredi': 'Vendredi',
    'samedi': 'Samedi',
    'dimanche': 'Dimanche'
  };
  return days[day.toLowerCase()] || day;
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

// Composant principal du calendrier dynamique
export function DynamicCalendar() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';

  // États
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [filters, setFilters] = useState({
    level: 'all',
    teacher: 'all',
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<number[]>([]);
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);

  // Récupérer les cours planifiés
  const { data: fixedSchedules, isLoading: isLoadingSchedules } = useQuery<FixedSchedule[]>({
    queryKey: ['/api/fixed-schedules'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/fixed-schedules');
      return res.json();
    }
  });

  // Récupérer les réunions Zoom
  const { data: zoomMeetings, isLoading: isLoadingMeetings } = useQuery<ZoomMeeting[]>({
    queryKey: ['/api/zoom-meetings'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/zoom-meetings');
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la récupération des réunions Zoom:', error);
        return [];
      }
    }
  });

  // Mutation pour créer une réunion Zoom
  const createZoomMutation = useMutation({
    mutationFn: async (fixedScheduleId: number) => {
      const res = await apiRequest('POST', `/api/fixed-schedules/${fixedScheduleId}/zoom`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zoom-meetings'] });
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

  // Mutation pour supprimer une réunion Zoom
  const deleteZoomMutation = useMutation({
    mutationFn: async (meetingId: number) => {
      try {
        const res = await apiRequest('DELETE', `/api/zoom-meetings/${meetingId}`);
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la suppression de la réunion Zoom:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zoom-meetings'] });
      toast({
        title: 'Réunion Zoom supprimée',
        description: 'La réunion Zoom a été supprimée avec succès',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erreur',
        description: `Erreur lors de la suppression de la réunion Zoom: ${error.message}`,
        variant: 'destructive',
      });
    }
  });

  // Mutation pour créer plusieurs réunions Zoom
  const createBulkZoomMutation = useMutation({
    mutationFn: async (fixedScheduleIds: number[]) => {
      try {
        const res = await apiRequest('POST', '/api/zoom-meetings/bulk', { fixedScheduleIds });
        return res.json();
      } catch (error) {
        console.error('Erreur lors de la création des réunions Zoom en masse:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/zoom-meetings'] });
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

  // Générer les événements du calendrier
  const events = useMemo(() => {
    if (!fixedSchedules || !zoomMeetings) return [];

    const calendarEvents: CalendarEvent[] = [];

    // Jours de la semaine en anglais et en français
    const weekDays = {
      'sunday': 0, 'dimanche': 0,
      'monday': 1, 'lundi': 1,
      'tuesday': 2, 'mardi': 2,
      'wednesday': 3, 'mercredi': 3,
      'thursday': 4, 'jeudi': 4,
      'friday': 5, 'vendredi': 5,
      'saturday': 6, 'samedi': 6
    };

    // Pour chaque cours planifié
    fixedSchedules.forEach(schedule => {
      if (!schedule.isActive) return;

      // Trouver l'index du jour dans la semaine (0-6)
      const dayKey = schedule.day.toLowerCase();
      const dayIndex = weekDays[dayKey];

      if (dayIndex === undefined) {
        console.warn(`Jour non reconnu: ${schedule.day}`);
        return;
      }

      // Calculer la date du prochain cours
      const today = new Date();
      const currentDayIndex = today.getDay(); // 0 = dimanche, 1 = lundi, etc.

      let daysToAdd = dayIndex - currentDayIndex;
      if (daysToAdd < 0) daysToAdd += 7; // Si le jour est déjà passé cette semaine

      const nextDate = addDays(today, daysToAdd);

      // Extraire les heures et minutes
      const [hours, minutes] = schedule.time.split(':').map(Number);

      // Définir l'heure de début et de fin
      const startDate = new Date(nextDate);
      startDate.setHours(hours, minutes, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMinutes(endDate.getMinutes() + schedule.duration);

      // Trouver la réunion Zoom associée
      const zoomMeeting = zoomMeetings.find(meeting => meeting.fixedScheduleId === schedule.id);

      // Créer l'événement
      calendarEvents.push({
        id: schedule.id,
        title: `${schedule.courseName} - ${schedule.teacherName}`,
        start: startDate,
        end: endDate,
        course: schedule.courseName,
        teacher: schedule.teacherName,
        level: schedule.level,
        status: zoomMeeting ? 'scheduled' : 'pending',
        zoomUrl: zoomMeeting?.zoomMeetingUrl,
        fixedScheduleId: schedule.id,
        zoomMeetingId: zoomMeeting?.zoomMeetingId
      });
    });

    return calendarEvents;
  }, [fixedSchedules, zoomMeetings]);

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

  // Obtenir les événements pour la vue actuelle
  const visibleEvents = useMemo(() => {
    if (view === 'day') {
      return filteredEvents.filter(event =>
        event.start.getDate() === currentDate.getDate() &&
        event.start.getMonth() === currentDate.getMonth() &&
        event.start.getFullYear() === currentDate.getFullYear()
      );
    } else if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Semaine commence le lundi
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });

      return filteredEvents.filter(event =>
        event.start >= start && event.start <= end
      );
    } else {
      // Vue mensuelle (à implémenter si nécessaire)
      return filteredEvents;
    }
  }, [filteredEvents, currentDate, view]);

  // Obtenir les jours de la semaine actuelle
  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Semaine commence le lundi
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });

    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  // Obtenir les options de filtrage
  const filterOptions = useMemo(() => {
    if (!events) return { teachers: [] };

    // Récupérer les professeurs réels depuis les événements
    const teachers = Array.from(new Set(events.map(event => event.teacher)));

    // Trier les professeurs par ordre alphabétique
    teachers.sort();

    return { teachers };
  }, [events]);

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
    if (selectedEvents.length === visibleEvents.length) {
      setSelectedEvents([]);
    } else {
      setSelectedEvents(visibleEvents.map(event => event.id));
    }
  };

  // Créer des réunions Zoom pour les événements sélectionnés
  const createZoomForSelected = () => {
    if (selectedEvents.length === 0) return;

    createBulkZoomMutation.mutate(selectedEvents);
  };

  return (
    <Card className="bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-xl font-bold">Calendrier des Cours</CardTitle>

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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/fixed-schedules', '/api/zoom-meetings'] })}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>

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
              onClick={() => setCurrentDate(prev => addDays(prev, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="font-medium">
              {format(currentDate, 'MMMM yyyy', { locale: fr })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentDate(prev => addDays(prev, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Aujourd'hui
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="day">Jour</TabsTrigger>
                <TabsTrigger value="week">Semaine</TabsTrigger>
              </TabsList>
            </Tabs>

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
        {isLoadingSchedules || isLoadingMeetings ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Vue hebdomadaire */}
            {view === 'week' && (
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
                    {visibleEvents
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

                          <div className="mt-1 text-sm">{event.teacher}</div>

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
                                onClick={() => createZoomMutation.mutate(event.fixedScheduleId)}
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
                                {event.status === 'scheduled' && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Implémenter la suppression
                                    }}
                                    className="text-red-600"
                                  >
                                    <Trash className="h-4 w-4 mr-2" />
                                    Supprimer Zoom
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            )}

            {/* Vue journalière */}
            {view === 'day' && (
              <div className="space-y-4">
                <div className="text-center font-medium text-lg">
                  {format(currentDate, 'EEEE d MMMM yyyy', { locale: fr })}
                </div>

                {visibleEvents.length > 0 ? (
                  <div className="space-y-2">
                    {visibleEvents.map(event => (
                      <div
                        key={`day-event-${event.id}`}
                        className={`p-3 rounded-md ${
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
                            <span className="font-medium text-lg">{event.course}</span>
                          </div>

                          <Badge variant="outline">
                            {getLevelLabel(event.level)}
                          </Badge>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="text-gray-600">
                            {format(event.start, 'HH:mm')} - {format(event.end, 'HH:mm')}
                          </div>

                          <div>{event.teacher}</div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          {event.status === 'scheduled' ? (
                            <a
                              href={event.zoomUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center"
                            >
                              <Link className="h-4 w-4 mr-2" />
                              Lien Zoom
                            </a>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => createZoomMutation.mutate(event.fixedScheduleId)}
                              disabled={createZoomMutation.isPending}
                            >
                              {createZoomMutation.isPending ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <>
                                  <Video className="h-4 w-4 mr-2" />
                                  Créer réunion Zoom
                                </>
                              )}
                            </Button>
                          )}

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="h-4 w-4 mr-2" />
                              Modifier
                            </Button>

                            {event.status === 'scheduled' && (
                              <Button variant="outline" size="sm" className="text-red-600">
                                <Trash className="h-4 w-4 mr-2" />
                                Supprimer Zoom
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    Aucun cours programmé pour cette journée
                  </div>
                )}
              </div>
            )}
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
    </Card>
  );
}
