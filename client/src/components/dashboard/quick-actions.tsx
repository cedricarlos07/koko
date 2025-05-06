import { Link } from "wouter";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  UserPlus, 
  BookOpen, 
  FolderInput,
  Plus
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { useAuth } from "@/hooks/use-auth";

export default function QuickActions() {
  const { user } = useAuth();
  
  // Only allow certain actions based on user role
  const isAdmin = user?.role === "admin";
  const isCoach = user?.role === "coach";
  const isTeacher = user?.role === "professor";
  
  const quickActions = [
    {
      title: "Add New User",
      description: "Create student or teacher account",
      icon: <UserPlus className="h-6 w-6" />,
      bgClass: "bg-primary-50 hover:bg-primary-100",
      iconClass: "bg-primary-100 text-primary-600",
      path: "/users",
      allowedRoles: ["admin"]
    },
    {
      title: "Create New Course",
      description: "Set up course details and sessions",
      icon: <BookOpen className="h-6 w-6" />,
      bgClass: "bg-secondary-50 hover:bg-secondary-100",
      iconClass: "bg-secondary-100 text-secondary-600",
      path: "/courses",
      allowedRoles: ["admin", "coach"]
    },
    {
      title: "Send Announcement",
      description: "Post message to all Telegram groups",
      icon: <FaTelegram className="h-6 w-6" />,
      bgClass: "bg-blue-50 hover:bg-blue-100",
      iconClass: "bg-blue-100 text-blue-600",
      path: "/telegram",
      allowedRoles: ["admin", "coach", "professor"]
    },
    {
      title: "Import Schedule",
      description: "Upload new CSV schedule file",
      icon: <FolderInput className="h-6 w-6" />,
      bgClass: "bg-green-50 hover:bg-green-100",
      iconClass: "bg-green-100 text-green-600",
      path: "/schedule",
      allowedRoles: ["admin"]
    },
  ];
  
  // Filter actions based on user role
  const filteredActions = quickActions.filter(action => {
    if (isAdmin) return true;
    if (isCoach && action.allowedRoles.includes("coach")) return true;
    if (isTeacher && action.allowedRoles.includes("professor")) return true;
    return false;
  });
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-5">
      <CardHeader className="p-0 pb-5">
        <CardTitle className="text-lg font-bold text-gray-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredActions.map((action, index) => (
            <Link key={index} href={action.path}>
              <button className={`${action.bgClass} transition-colors rounded-xl p-4 flex flex-col items-center text-center w-full`}>
                <div className={`${action.iconClass} w-12 h-12 rounded-full flex items-center justify-center mb-3`}>
                  {action.icon}
                </div>
                <h3 className="text-sm font-medium text-gray-800 mb-1">{action.title}</h3>
                <p className="text-xs text-gray-500">{action.description}</p>
              </button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
