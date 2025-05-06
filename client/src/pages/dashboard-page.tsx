import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { Loader2, Calendar, Users, Book, Activity, Clock, Award, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";

interface DashboardData {
  userStats: {
    totalSessions: number;
    totalAttendance: number;
    totalPoints: number;
    attendanceRate: number;
    badgeCount: number;
  };
  recentActivity: Array<{
    id: number;
    type: string;
    description: string;
    createdAt: string;
    userId: number;
    username?: string;
  }>;
  upcomingSessions: Array<{
    id: number;
    title: string;
    scheduledDate: string;
    scheduledTime: string;
    courseName: string;
    professorName: string;
    zoomMeetingUrl?: string;
  }>;
}

// Données par défaut pour le tableau de bord
const defaultData: DashboardData = {
  userStats: {
    totalSessions: 14,
    totalAttendance: 10,
    totalPoints: 240,
    attendanceRate: 71,
    badgeCount: 3,
  },
  recentActivity: [
    {
      id: 1,
      type: "login",
      description: "Utilisateur Admin s'est connecté",
      createdAt: new Date().toISOString(),
      userId: 1,
      username: "Admin User"
    },
    {
      id: 2,
      type: "session_created",
      description: "Une nouvelle session a été créée: Business Beginners avec Mina Lepsanovic",
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      userId: 1,
      username: "Admin User"
    },
    {
      id: 3,
      type: "badge_award",
      description: "Badge 'Participation' attribué à l'utilisateur",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      userId: 1,
      username: "Admin User"
    }
  ],
  upcomingSessions: [
    {
      id: 1,
      title: "Business Beginners - 8:30pm",
      scheduledDate: "2025-03-03T20:30:00",
      scheduledTime: "20:30",
      courseName: "Business Beginners",
      professorName: "Mina Lepsanovic",
      zoomMeetingUrl: "https://us02web.zoom.us/j/84567183548"
    },
    {
      id: 2,
      title: "Academic Beginners - 9:00pm",
      scheduledDate: "2025-03-03T21:00:00",
      scheduledTime: "21:00",
      courseName: "Academic Beginners",
      professorName: "Hafida Faraj",
      zoomMeetingUrl: "https://us02web.zoom.us/j/86446430482"
    },
    {
      id: 3,
      title: "Intermediate General - 7:00pm",
      scheduledDate: "2025-03-04T19:00:00",
      scheduledTime: "19:00",
      courseName: "Intermediate General",
      professorName: "Jahnvi Mahtani",
      zoomMeetingUrl: "https://us02web.zoom.us/j/83265150843"
    }
  ]
};

// Utilisateur administrateur par défaut
const adminUser = {
  firstName: "Admin",
  lastName: "User",
  username: "admin",
  role: "admin",
  avatarUrl: "",
  points: 240
};

export default function DashboardPage() {
  // Utiliser les données en dur au lieu d'appeler l'API
  const data: DashboardData = defaultData;
  const user = adminUser;
  const isLoading = false;
  const error = null;
  
  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header moderne avec dégradé et effets */}
      <div className="bg-gradient-to-br from-[#E5133C] via-red-500 to-pink-600 text-white py-12 md:py-16 mb-8 relative overflow-hidden rounded-b-2xl">
        {/* Cercles décoratifs en arrière-plan */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mt-20 -mr-20 blur-xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -mb-20 -ml-10 blur-lg"></div>
        <div className="absolute -bottom-24 right-20 w-72 h-72 bg-white/5 rounded-full blur-lg"></div>
        
        {/* Formes géométriques flottantes */}
        <div className="absolute top-20 right-[20%] w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-lg rotate-12 float-animation"></div>
        <div className="absolute bottom-12 left-[15%] w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-full float-animation" style={{animationDelay: '1s'}}></div>
        <div className="absolute top-1/2 left-[75%] w-20 h-6 md:w-24 md:h-8 bg-white/10 rounded-lg -rotate-12 float-animation" style={{animationDelay: '2s'}}></div>
        
        <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div className="mb-6 md:mb-0">
              <div className="inline-block bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
                <span className="flex items-center">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  Plateforme d'apprentissage d'anglais
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                Bonjour, <span className="text-yellow-300">{user?.firstName || "Student"}</span> !
              </h1>
              <p className="text-white/80 text-sm md:text-base max-w-xl">
                Voici un aperçu de vos activités et statistiques sur la plateforme KODJO ENGLISH BOT. Suivez votre progression et gérez vos sessions facilement.
              </p>
            </div>
            <div className="mt-4 md:mt-0 md:ml-10">
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 p-3 md:p-4 rounded-2xl flex items-center shadow-lg card-hover">
                <Avatar className="h-12 w-12 md:h-14 md:w-14 mr-3 md:mr-4 ring-2 ring-white pulse-animation">
                  <AvatarImage src={user?.avatarUrl} alt={user?.username} />
                  <AvatarFallback className="bg-gradient-to-br from-[#E5133C] to-red-600 text-white">
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white text-base md:text-lg">{user?.firstName} {user?.lastName}</p>
                  <div className="flex items-center mt-1">
                    <div className="bg-white/20 px-2 py-0.5 rounded-full text-xs mr-2">
                      {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
                    </div>
                    <div className="bg-yellow-400/20 text-yellow-200 px-2 py-0.5 rounded-full text-xs flex items-center">
                      <Award className="h-3 w-3 mr-1" /> {user?.points || 0} pts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stats Cards avec design moderne et effets 3D */}
      <div className="container max-w-7xl mx-auto px-6 pb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 pl-1 flex items-center">
          <Activity className="w-5 h-5 mr-2 text-[#E5133C]" />
          Statistiques et Performances
        </h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {/* Card Sessions */}
          <div className="card-3d group">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-card-icon gradient-red rounded-2xl group-hover:scale-110 transition-transform">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="stat-card-badge positive flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>14.3%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Sessions programmées</p>
              <div className="flex items-end gap-1">
                <p className="text-3xl font-bold text-gray-800">{data?.userStats.totalSessions || 0}</p>
                <span className="text-sm text-gray-500 mb-1">sessions</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-[#E5133C] to-pink-600 h-full rounded-full" 
                     style={{ width: `${Math.min((data?.userStats.totalSessions || 0) / 20 * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
          
          {/* Card Présence */}
          <div className="card-3d group">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-card-icon gradient-blue rounded-2xl group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <div className="stat-card-badge positive flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>5.2%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Taux de présence</p>
              <div className="flex items-end gap-1">
                <p className="text-3xl font-bold text-gray-800">
                  {data?.userStats.attendanceRate ? `${Math.round(data.userStats.attendanceRate)}` : '0'}
                </p>
                <span className="text-sm text-gray-500 mb-1">%</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full" 
                     style={{ width: `${Math.min((data?.userStats.attendanceRate || 0), 100)}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {data?.userStats.totalAttendance || 0} sessions assistées
              </p>
            </div>
          </div>
          
          {/* Card Badges */}
          <div className="card-3d group">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-card-icon bg-gradient-to-r from-amber-400 to-yellow-500 rounded-2xl group-hover:scale-110 transition-transform">
                <Award className="h-6 w-6" />
              </div>
              <div className="stat-card-badge positive flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>New</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Badges gagnés</p>
              <div className="flex items-end gap-1">
                <p className="text-3xl font-bold text-gray-800">{data?.userStats.badgeCount || 0}</p>
                <span className="text-sm text-gray-500 mb-1">badges</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-amber-400 to-yellow-500 h-full rounded-full" 
                     style={{ width: `${Math.min((data?.userStats.badgeCount || 0) / 10 * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
          
          {/* Card Points */}
          <div className="card-3d group">
            <div className="flex items-center justify-between mb-4">
              <div className="stat-card-icon bg-gradient-to-r from-green-400 to-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <div className="stat-card-badge positive flex items-center">
                <ChevronUp className="h-3 w-3 mr-1" />
                <span>18.7%</span>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500 font-medium">Points accumulés</p>
              <div className="flex items-end gap-1">
                <p className="text-3xl font-bold text-gray-800">{data?.userStats.totalPoints || 0}</p>
                <span className="text-sm text-gray-500 mb-1">pts</span>
              </div>
              <div className="w-full bg-gray-100 h-1.5 rounded-full mt-3 overflow-hidden">
                <div className="bg-gradient-to-r from-green-400 to-emerald-500 h-full rounded-full" 
                     style={{ width: `${Math.min((data?.userStats.totalPoints || 0) / 500 * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Sections modernes */}
      <div className="container max-w-7xl mx-auto px-6 mb-16">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2">
          {/* Sessions à venir redessinées */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6 pl-1 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[#E5133C]" />
              Sessions à venir
            </h2>
            <div className="card-3d p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#E5133C]/5 to-purple-500/5 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Prochains rendez-vous</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Vos prochaines classes programmées
                    </p>
                  </div>
                  <span className="bg-[#E5133C]/10 text-[#E5133C] px-2.5 py-1 text-xs rounded-full font-medium">
                    {data?.upcomingSessions?.length || 0} Sessions
                  </span>
                </div>
              </div>
              
              <div className="p-6">
                {data?.upcomingSessions && data.upcomingSessions.length > 0 ? (
                  <div className="space-y-6">
                    {data.upcomingSessions.map((session) => {
                      const sessionDate = new Date(session.scheduledDate);
                      return (
                        <div key={session.id} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                          <div className="flex items-start">
                            <div className="flex-shrink-0 mr-4">
                              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E5133C] to-pink-600 flex items-center justify-center text-white">
                                <span className="font-semibold text-sm">{format(sessionDate, 'dd')}</span>
                              </div>
                              <div className="text-xs font-semibold text-center mt-1">
                                {format(sessionDate, 'MMM')}
                              </div>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold text-gray-800">{session.title}</h4>
                                <div className="bg-blue-100 text-blue-700 text-xs px-2.5 py-1 rounded-full flex items-center">
                                  <Clock className="mr-1 h-3 w-3" />
                                  {session.scheduledTime}
                                </div>
                              </div>
                              
                              <p className="text-sm text-gray-600 mt-1">
                                <span className="inline-flex items-center">
                                  <Book className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                  {session.courseName}
                                </span>
                                <span className="mx-2 text-gray-300">•</span>
                                <span className="inline-flex items-center">
                                  <Users className="h-3.5 w-3.5 mr-1 text-gray-400" />
                                  {session.professorName}
                                </span>
                              </p>
                              
                              {session.zoomMeetingUrl && (
                                <div className="mt-4">
                                  <a 
                                    href={session.zoomMeetingUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-sm"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current">
                                      <path d="M24 12c0 6.627-5.373 12-12 12S0 18.627 0 12 5.373 0 12 0s12 5.373 12 12zm-12 1.438a1.454 1.454 0 0 1-1.458-1.458c0-.805.653-1.458 1.458-1.458s1.458.653 1.458 1.458c0 .805-.653 1.458-1.458 1.458zm-3.75-1.458a1.458 1.458 0 1 1 2.916 0 1.458 1.458 0 0 1-2.916 0zm7.5 0a1.458 1.458 0 1 1 2.916 0 1.458 1.458 0 0 1-2.916 0z" />
                                    </svg>
                                    Rejoindre le cours
                                  </a>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gray-100">
                      <Book className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">Aucune session programmée</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                      Vous n'avez pas de sessions à venir pour le moment. Consultez le calendrier pour plus d'informations.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Activités récentes redessinées */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-6 pl-1 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-[#E5133C]" />
              Activités récentes
            </h2>
            <div className="card-3d p-0 overflow-hidden">
              <div className="bg-gradient-to-r from-[#E5133C]/5 to-purple-500/5 p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold">Journal d'activités</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Les dernières activités de la plateforme
                    </p>
                  </div>
                  <span className="bg-[#E5133C]/10 text-[#E5133C] px-2.5 py-1 text-xs rounded-full font-medium">
                    {data?.recentActivity?.length || 0} Actions
                  </span>
                </div>
              </div>
              
              <div className="relative p-6">
                {/* Ligne verticale de timeline */}
                <div className="absolute left-[2.25rem] top-8 bottom-8 w-px bg-gray-200"></div>
                
                {data?.recentActivity && data.recentActivity.length > 0 ? (
                  <div className="space-y-6">
                    {data.recentActivity.map((activity) => {
                      const activityDate = new Date(activity.createdAt);
                      let iconBg, icon, borderColor;
                      
                      switch (activity.type) {
                        case 'login':
                          iconBg = 'bg-blue-500';
                          borderColor = 'border-blue-200';
                          icon = <Users className="h-4 w-4 text-white" />;
                          break;
                        case 'session_created':
                          iconBg = 'bg-green-500';
                          borderColor = 'border-green-200';
                          icon = <Calendar className="h-4 w-4 text-white" />;
                          break;
                        case 'badge_award':
                          iconBg = 'bg-yellow-500';
                          borderColor = 'border-yellow-200';
                          icon = <Award className="h-4 w-4 text-white" />;
                          break;
                        default:
                          iconBg = 'bg-[#E5133C]';
                          borderColor = 'border-pink-200';
                          icon = <Activity className="h-4 w-4 text-white" />;
                      }
                      
                      return (
                        <div key={activity.id} className={`bg-white rounded-xl p-4 shadow-sm border ${borderColor} ml-8 relative hover:shadow-md transition-all`}>
                          {/* Timeline dot */}
                          <div className={`absolute -left-12 top-4 w-8 h-8 rounded-full ${iconBg} flex items-center justify-center shadow-sm z-10`}>
                            {icon}
                          </div>
                          
                          <div className="flex flex-col">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm text-gray-700">{activity.username}</p>
                              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                {format(activityDate, 'HH:mm')}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{activity.description}</p>
                            <span className="text-xs text-gray-400 mt-2">
                              {format(activityDate, 'dd MMM yyyy')}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center">
                    <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center bg-gray-100">
                      <Activity className="h-10 w-10 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-800">Aucune activité récente</h3>
                    <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
                      Il n'y a pas d'activités récentes à afficher pour le moment. Les activités seront enregistrées lorsque vous interagirez avec la plateforme.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}