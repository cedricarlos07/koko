import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Video,
  Search,
  Link,
  BarChart,
  Users,
  Clock,
  Info,
  CheckCircle,
  Calendar,
  Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for Zoom-related data
interface Session {
  id: number;
  courseId: number;
  sessionNumber: number;
  professorId: number | null;
  scheduledDate: number;
  scheduledTime: string;
  timeZone: string;
  zoomMeetingId: string | null;
  zoomMeetingUrl: string | null;
  status: string;
  createdAt: number;
}

interface Course {
  id: number;
  name: string;
  level: string;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface Attendance {
  id: number;
  sessionId: number;
  userId: number;
  joinTime: number;
  leaveTime: number | null;
  duration: number;
  present: number; // 0 or 1
  createdAt: number;
}

// Form schema for marking attendance
const attendanceSchema = z.object({
  sessionId: z.number({
    required_error: "Please select a session",
  }),
});

type AttendanceFormValues = z.infer<typeof attendanceSchema>;

export default function ZoomPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [searchTerm, setSearchTerm] = useState("");
  const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: isLoadingUpcoming } = useQuery<any[]>({
    queryKey: ["/api/sessions/upcoming", { limit: 10 }],
    onError: (error) => {
      console.error("Error fetching upcoming sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load upcoming sessions",
        variant: "destructive",
      });
    }
  });

  // Fetch all sessions
  const { data: allSessions, isLoading: isLoadingAll } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  // Fetch courses
  const { data: courses } = useQuery<Course[]>({
    queryKey: ["/api/courses"],
  });

  // Fetch professors
  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const professors = users?.filter(user => user.role === "professor") || [];

  // Create Zoom meeting mutation
  const createZoomMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`/api/sessions/${sessionId}/zoom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ duration: 60 }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create Zoom meeting");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Zoom meeting created",
        description: "A Zoom meeting has been created for this session.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/upcoming"] });
    },
    onError: (error) => {
      toast({
        title: "Error creating Zoom meeting",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark attendance mutation
  const markAttendanceMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const res = await fetch(`/api/sessions/${sessionId}/attendance/zoom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to mark attendance");
      }

      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Attendance marked",
        description: "Attendance has been marked for this session based on Zoom data.",
      });
      setIsAttendanceDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sessions/upcoming"] });
    },
    onError: (error) => {
      toast({
        title: "Error marking attendance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form for marking attendance
  const attendanceForm = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: {
      sessionId: 0,
    },
  });

  // Handle marking attendance
  const onAttendanceSubmit = (data: AttendanceFormValues) => {
    markAttendanceMutation.mutate(data.sessionId);
  };

  // Handle creating Zoom meeting
  const handleCreateZoom = (sessionId: number) => {
    createZoomMutation.mutate(sessionId);
  };

  // Handle opening attendance dialog
  const handleOpenAttendanceDialog = (session: Session) => {
    setSelectedSession(session);
    attendanceForm.setValue("sessionId", session.id);
    setIsAttendanceDialogOpen(true);
  };

  // Filter sessions based on search term
  const filteredSessions = allSessions?.filter(session => {
    const course = courses?.find(c => c.id === session.courseId);
    const professor = professors?.find(p => p.id === session.professorId);

    return (
      course?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professor?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      professor?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      session.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  // Get course name
  const getCourseName = (courseId: number) => {
    const course = courses?.find(c => c.id === courseId);
    return course?.name || "Unknown Course";
  };

  // Get professor name
  const getProfessorName = (professorId: number | null) => {
    if (!professorId) return "TBD";
    const professor = professors?.find(p => p.id === professorId);
    return professor ? `${professor.firstName} ${professor.lastName}` : "Unknown";
  };

  // Format time until session
  const formatTimeUntil = (date: number, time: string) => {
    const sessionDate = new Date(date);
    const [hours, minutes] = time.split(':');
    sessionDate.setHours(parseInt(hours), parseInt(minutes));

    const now = new Date();
    const diff = sessionDate.getTime() - now.getTime();

    if (diff < 0) return "In progress/Completed";

    const minutes_diff = Math.floor(diff / 1000 / 60);
    const hours_diff = Math.floor(minutes_diff / 60);
    const days_diff = Math.floor(hours_diff / 24);

    if (days_diff > 0) {
      return `In ${days_diff} day${days_diff > 1 ? 's' : ''}`;
    } else if (hours_diff > 0) {
      return `In ${hours_diff} hour${hours_diff > 1 ? 's' : ''}`;
    } else {
      return `In ${minutes_diff} minute${minutes_diff > 1 ? 's' : ''}`;
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string, zoomMeetingUrl: string | null) => {
    if (status === "completed") {
      return <Badge variant="secondary">Completed</Badge>;
    } else if (status === "scheduled") {
      if (zoomMeetingUrl) {
        return <Badge variant="success" className="bg-green-100 text-green-700 hover:bg-green-100">Ready</Badge>;
      } else {
        return <Badge variant="outline">Needs Zoom</Badge>;
      }
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Zoom Meetings" />

        {/* Zoom Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="upcoming">Upcoming Meetings</TabsTrigger>
                  <TabsTrigger value="all">All Sessions</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                </TabsList>

                {activeTab === "all" && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                      type="text"
                      placeholder="Search sessions..."
                      className="pl-8 w-60"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                )}
              </div>

              {/* Upcoming Meetings Tab */}
              <TabsContent value="upcoming" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Upcoming Zoom Meetings</CardTitle>
                    <CardDescription>
                      Manage upcoming course sessions and their Zoom meetings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Session</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingUpcoming ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={6} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : upcomingSessions && upcomingSessions.length > 0 ? (
                            upcomingSessions.map((session, index) => {
                              // Vérifier la structure des données et fournir des valeurs par défaut
                              const sessionData = session.session || session;
                              const sessionId = sessionData.id || index;
                              const sessionNumber = sessionData.sessionNumber || 1;
                              const scheduledDate = sessionData.scheduledDate || Date.now();
                              const scheduledTime = sessionData.scheduledTime || "12:00";
                              const timeZone = sessionData.timeZone || "GMT";
                              const status = sessionData.status || "scheduled";
                              const zoomMeetingUrl = sessionData.zoomMeetingUrl || null;

                              return (
                                <TableRow key={sessionId}>
                                  <TableCell className="font-medium">
                                    {session.courseName || "Unknown Course"}
                                  </TableCell>
                                  <TableCell>
                                    Session #{sessionNumber}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span>
                                        {format(new Date(scheduledDate), "MMM dd, yyyy")}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {scheduledTime} {timeZone}
                                      </span>
                                      <span className="text-xs text-green-600">
                                        {formatTimeUntil(scheduledDate, scheduledTime)}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {session.professorFirstName && session.professorLastName
                                      ? `${session.professorFirstName} ${session.professorLastName}`
                                      : "TBD"}
                                  </TableCell>
                                  <TableCell>
                                    {getStatusBadge(status, zoomMeetingUrl)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex space-x-2">
                                      {zoomMeetingUrl ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            asChild
                                          >
                                            <a
                                              href={zoomMeetingUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              <Link className="mr-2 h-4 w-4" />
                                              Join
                                            </a>
                                          </Button>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleOpenAttendanceDialog(sessionData)}
                                          >
                                            <Users className="mr-2 h-4 w-4" />
                                            Attendance
                                          </Button>
                                        </>
                                      ) : (
                                        <Button
                                          size="sm"
                                          onClick={() => handleCreateZoom(sessionId)}
                                          disabled={createZoomMutation.isPending}
                                        >
                                          {createZoomMutation.isPending ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          ) : (
                                            <Video className="mr-2 h-4 w-4" />
                                          )}
                                          Create Zoom
                                        </Button>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                                No upcoming sessions found
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* All Sessions Tab */}
              <TabsContent value="all" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>All Sessions</CardTitle>
                    <CardDescription>
                      View and manage all course sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead>Session</TableHead>
                            <TableHead>Date & Time</TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Zoom Link</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingAll ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={7} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : filteredSessions && filteredSessions.length > 0 ? (
                            filteredSessions.map((session) => (
                              <TableRow key={session.id}>
                                <TableCell className="font-medium">
                                  {getCourseName(session.courseId)}
                                </TableCell>
                                <TableCell>
                                  Session #{session.sessionNumber}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <span>
                                      {format(new Date(session.scheduledDate), "MMM dd, yyyy")}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      {session.scheduledTime} {session.timeZone || "GMT"}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {getProfessorName(session.professorId)}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(session.status, session.zoomMeetingUrl)}
                                </TableCell>
                                <TableCell>
                                  {session.zoomMeetingUrl ? (
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="h-auto p-0"
                                      asChild
                                    >
                                      <a
                                        href={session.zoomMeetingUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        View Link
                                      </a>
                                    </Button>
                                  ) : (
                                    <span className="text-gray-500 text-sm">Not created</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {session.zoomMeetingUrl ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenAttendanceDialog(session)}
                                    >
                                      <Users className="mr-2 h-4 w-4" />
                                      Attendance
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      onClick={() => handleCreateZoom(session.id)}
                                      disabled={createZoomMutation.isPending}
                                    >
                                      {createZoomMutation.isPending ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : (
                                        <Video className="mr-2 h-4 w-4" />
                                      )}
                                      Create Zoom
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                                {searchTerm ? "No sessions matching your search" : "No sessions found"}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Attendance Overview</CardTitle>
                    <CardDescription>
                      Track and manage student attendance in Zoom sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Average Attendance</p>
                            <Users className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-800">87%</p>
                          <p className="text-xs text-green-600 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                            </svg>
                            Up 3% from last month
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Total Sessions</p>
                            <Calendar className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-800">126</p>
                          <p className="text-xs text-gray-500 mt-1">All time</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Avg. Session Duration</p>
                            <Clock className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-800">52 min</p>
                          <p className="text-xs text-gray-500 mt-1">Out of 60 min scheduled</p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 flex flex-col">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium text-gray-500">Perfect Attendance</p>
                            <CheckCircle className="h-4 w-4 text-gray-400" />
                          </div>
                          <p className="text-2xl font-bold text-gray-800">24</p>
                          <p className="text-xs text-gray-500 mt-1">Students with 100% attendance</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Alert */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
                        <div>
                          <h4 className="text-sm font-medium text-blue-800 mb-1">About Attendance Tracking</h4>
                          <p className="text-sm text-blue-700">
                            Attendance is automatically tracked based on Zoom participation data.
                            Students need at least 10 minutes of presence to be marked as attended.
                            Use the "Mark Attendance" button after a session to process the data.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Recent Sessions with Attendance */}
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Course & Session</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Professor</TableHead>
                            <TableHead>Attendance</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingAll ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={5} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : allSessions ? (
                            allSessions
                              .filter(session => session.status === "completed" && session.zoomMeetingId)
                              .slice(0, 5)
                              .map((session) => (
                                <TableRow key={session.id}>
                                  <TableCell className="font-medium">
                                    <div className="flex flex-col">
                                      <span>{getCourseName(session.courseId)}</span>
                                      <span className="text-sm text-gray-500">Session #{session.sessionNumber}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {format(new Date(session.scheduledDate), "MMM dd, yyyy")}
                                  </TableCell>
                                  <TableCell>
                                    {getProfessorName(session.professorId)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center">
                                      <span className="text-sm font-medium">85%</span>
                                      <div className="ml-2 w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="bg-green-500 h-full" style={{ width: "85%" }}></div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button variant="outline" size="sm">
                                      <BarChart className="mr-2 h-4 w-4" />
                                      Details
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                No completed sessions with attendance data
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Mark Attendance Dialog */}
      <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Attendance from Zoom</DialogTitle>
            <DialogDescription>
              Fetch and process attendance data from Zoom for this session.
            </DialogDescription>
          </DialogHeader>

          {selectedSession && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-sm text-gray-500">Course</p>
                    <p className="font-medium">{getCourseName(selectedSession.courseId)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Session</p>
                    <p className="font-medium">Session #{selectedSession.sessionNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{format(new Date(selectedSession.scheduledDate), "MMM dd, yyyy")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Time</p>
                    <p className="font-medium">{selectedSession.scheduledTime} {selectedSession.timeZone || "GMT"}</p>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-sm text-gray-500">Zoom Meeting</p>
                  <p className="font-medium break-all">{selectedSession.zoomMeetingUrl}</p>
                </div>
              </div>

              <Form {...attendanceForm}>
                <form onSubmit={attendanceForm.handleSubmit(onAttendanceSubmit)}>
                  <DialogFooter className="mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAttendanceDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={markAttendanceMutation.isPending}
                    >
                      {markAttendanceMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Users className="mr-2 h-4 w-4" />
                      )}
                      Mark Attendance
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
