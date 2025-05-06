import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CheckCircle, 
  Medal, 
  UserPlus, 
  AlertCircle 
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";

interface ActivityItem {
  id: number;
  userId: number | null;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  type: string;
  description: string;
  metadata: string | null;
  createdAt: number;
}

export default function RecentActivity() {
  const { data: activities, isLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
  });
  
  const getActivityIcon = (type: string) => {
    switch (type) {
      case "session_completed":
        return <CheckCircle className="h-5 w-5" />;
      case "telegram_reminder":
      case "telegram_message":
      case "telegram_announcement":
        return <FaTelegram className="h-5 w-5" />;
      case "badge_awarded":
        return <Medal className="h-5 w-5" />;
      case "user_joined":
      case "register":
        return <UserPlus className="h-5 w-5" />;
      case "zoom_attendance":
      case "low_attendance":
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };
  
  const getActivityIconBg = (type: string) => {
    switch (type) {
      case "session_completed":
        return "bg-green-100 text-green-600";
      case "telegram_reminder":
      case "telegram_message":
      case "telegram_announcement":
        return "bg-blue-100 text-blue-600";
      case "badge_awarded":
        return "bg-purple-100 text-purple-600";
      case "user_joined":
      case "register":
        return "bg-yellow-100 text-yellow-600";
      case "zoom_attendance":
      case "low_attendance":
        return "bg-red-100 text-red-600";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };
  
  const formatDescription = (activity: ActivityItem) => {
    // Replace any placeholders in the description with actual values
    let desc = activity.description;
    
    if (activity.firstName && activity.lastName) {
      desc = desc.replace(/User/g, `${activity.firstName} ${activity.lastName}`);
    }
    
    return desc;
  };
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-5 h-full">
      <CardHeader className="p-0 pb-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-800">Recent Activity</CardTitle>
          <Link href="/statistics">
            <Button variant="link" className="text-primary-600 hover:text-primary-800 text-sm font-medium h-auto p-0">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex">
              <div className="flex-shrink-0 mr-3">
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
              <div>
                <Skeleton className="h-4 w-60" />
                <Skeleton className="h-3 w-24 mt-1" />
              </div>
            </div>
          ))
        ) : activities && activities.length > 0 ? (
          activities.slice(0, 5).map((activity) => (
            <div key={activity.id} className="flex">
              <div className="flex-shrink-0 mr-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${getActivityIconBg(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: formatDescription(activity) }} />
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-4">No recent activity</div>
        )}
      </CardContent>
    </Card>
  );
}
