import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ExternalLink, Video } from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Skeleton } from "@/components/ui/skeleton";

interface Session {
  session: {
    id: number;
    courseId: number;
    sessionNumber: number;
    professorId: number | null;
    scheduledDate: number;
    scheduledTime: string;
    zoomMeetingUrl: string | null;
    status: string;
  };
  courseName: string;
  courseLevel: string;
  professorFirstName: string | null;
  professorLastName: string | null;
}

export default function UpcomingClasses() {
  const { data: upcomingClasses, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions/upcoming"],
  });
  
  const handleCreateZoom = async (sessionId: number) => {
    try {
      await fetch(`/api/sessions/${sessionId}/zoom`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      
      // Refetch the data
      await fetch("/api/sessions/upcoming", { credentials: "include" });
    } catch (error) {
      console.error("Error creating Zoom meeting:", error);
    }
  };
  
  const handleSendReminder = async (sessionId: number) => {
    try {
      await fetch(`/api/sessions/${sessionId}/telegram/remind`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ minutesRemaining: 30 }),
        credentials: "include",
      });
    } catch (error) {
      console.error("Error sending reminder:", error);
    }
  };
  
  const calculateTimeRemaining = (session: Session) => {
    const now = new Date();
    const sessionTime = new Date(session.session.scheduledDate);
    
    const [hours, minutes] = session.session.scheduledTime.split(":");
    sessionTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    
    const diff = sessionTime.getTime() - now.getTime();
    
    if (diff < 0) return "In progress";
    
    const minutesDiff = Math.floor(diff / 1000 / 60);
    const hoursDiff = Math.floor(minutesDiff / 60);
    
    if (hoursDiff > 24) {
      const days = Math.floor(hoursDiff / 24);
      return `In ${days} day${days > 1 ? 's' : ''}`;
    }
    
    if (hoursDiff >= 1) {
      return `In ${hoursDiff} hour${hoursDiff > 1 ? 's' : ''}`;
    }
    
    return `Starts in ${minutesDiff} minutes`;
  };
  
  const getClassLevelAbbr = (level: string) => {
    return level.toUpperCase();
  };
  
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
    <Card className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
      <CardHeader className="p-0 pb-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-800">Upcoming Classes</CardTitle>
          <Link href="/courses">
            <Button variant="link" className="text-primary-600 hover:text-primary-800 text-sm font-medium h-auto p-0">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Instructor</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time (GMT)</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Skeleton className="w-8 h-8 rounded-md mr-3" />
                        <div>
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-16 mt-1" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16 mt-1" />
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : upcomingClasses && upcomingClasses.length > 0 ? (
                upcomingClasses.map((item) => (
                  <tr key={item.session.id}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center text-xs font-medium mr-3 ${getLevelColor(item.courseLevel)}`}>
                          {getClassLevelAbbr(item.courseLevel)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{item.courseName}</div>
                          <div className="text-xs text-gray-500">Session #{item.session.sessionNumber}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {item.professorFirstName && item.professorLastName
                          ? `${item.professorFirstName} ${item.professorLastName}`
                          : "TBD"}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {format(new Date(item.session.scheduledDate), "MMM dd, yyyy")}, {item.session.scheduledTime}
                      </div>
                      <div className={`text-xs ${
                        calculateTimeRemaining(item).includes("Starts in")
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}>
                        {calculateTimeRemaining(item)}
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" className="text-blue-600 hover:text-blue-800 h-7 w-7">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-green-600 hover:text-green-800 h-7 w-7"
                          onClick={() => handleCreateZoom(item.session.id)}
                          disabled={!!item.session.zoomMeetingUrl}
                        >
                          <Video className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-indigo-600 hover:text-indigo-800 h-7 w-7"
                          onClick={() => handleSendReminder(item.session.id)}
                        >
                          <FaTelegram className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500">
                    No upcoming classes found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
