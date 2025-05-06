import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import {
  BookOpen,
  Users,
  ChartBar,
  Calendar,
  Video,
  Award,
  Bot,
  BarChart,
  Settings,
  LogOut,
  LucideIcon,
  Home,
  GraduationCap,
  MenuIcon,
  X,
  ActivitySquare,
  Zap
} from "lucide-react";
import { FaTelegram } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useState } from "react";

type MenuItem = {
  path: string;
  label: string;
  icon: React.ReactNode;
  section?: string;
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Si aucun utilisateur n'est connecté, utilisez un utilisateur par défaut
  const currentUser = user || {
    firstName: "Admin",
    lastName: "User",
    username: "admin",
    email: "admin@kodjo.com",
    role: "admin",
    avatarUrl: "",
    points: 240
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const menuItems: MenuItem[] = [
    { section: "GÉNÉRAL", path: "/dashboard", label: "Tableau de bord", icon: <Home className="h-5 w-5" /> },
    { path: "/schedule", label: "Calendrier", icon: <Calendar className="h-5 w-5" /> },
    { section: "COURS", path: "/users", label: "Utilisateurs", icon: <Users className="h-5 w-5" /> },
    { section: "OUTILS", path: "/telegram", label: "Bot Telegram", icon: <FaTelegram className="h-5 w-5" /> },
    { path: "/telegram/test", label: "Tests & Activité", icon: <ActivitySquare className="h-5 w-5" /> },
    { path: "/telegram/playground", label: "Playground Complet", icon: <Zap className="h-5 w-5" /> },
    { path: "/zoom", label: "Réunions Zoom", icon: <Video className="h-5 w-5" /> },
    { path: "/badges", label: "Badges & Points", icon: <Award className="h-5 w-5" /> },
    { path: "/automations", label: "Automatisations", icon: <Bot className="h-5 w-5" /> },
    { path: "/statistics", label: "Statistiques", icon: <BarChart className="h-5 w-5" /> },
  ];

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const toggleMobileSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  // Regrouper les éléments du menu par section
  const groupedMenuItems: Record<string, MenuItem[]> = {};
  menuItems.forEach(item => {
    const section = item.section || "AUTRES";
    if (!groupedMenuItems[section]) {
      groupedMenuItems[section] = [];
    }
    groupedMenuItems[section].push(item);
  });

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn(
        "flex items-center py-6",
        isCollapsed ? "justify-center px-2" : "justify-between px-6",
      )}>
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#E5133C] to-pink-600 flex items-center justify-center text-white font-bold">K</div>
            <div className="ml-2">
              <span className="text-[#E5133C] font-bold text-xl">KODJO</span>
              <span className="ml-1 font-bold text-xl">ENGLISH</span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#E5133C] to-pink-600 flex items-center justify-center text-white font-bold">K</div>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "text-gray-400 hover:text-gray-600 hidden md:flex",
            isCollapsed && "self-center"
          )}
          onClick={toggleSidebar}
        >
          <MenuIcon className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-600 md:hidden"
          onClick={toggleMobileSidebar}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation Links */}
      <nav className={cn(
        "flex-1 overflow-y-auto px-4",
        isCollapsed ? "px-2" : "px-4"
      )}>
        {Object.entries(groupedMenuItems).map(([section, items]) => (
          <div key={section} className="mb-6">
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-500 mb-3 px-2">{section}</h3>
            )}
            <ul className="space-y-1">
              {items.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + "/");
                return (
                  <li key={item.path}>
                    <div className={cn(
                      "flex items-center px-3 py-2.5 rounded-lg font-medium transition-all cursor-pointer",
                      isActive
                        ? "bg-gradient-to-r from-[#E5133C]/10 to-pink-500/10 text-[#E5133C]"
                        : "text-gray-600 hover:bg-gray-100/60 hover:text-gray-800",
                      isCollapsed ? "justify-center" : "justify-start"
                    )}
                      onClick={() => window.location.href = item.path}
                    >
                      <div className={cn(
                        "flex items-center justify-center",
                        isActive && "text-[#E5133C]"
                      )}>
                        {item.icon}
                      </div>
                      {!isCollapsed && <span className="ml-3">{item.label}</span>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className={cn(
        "mt-auto border-t border-gray-200 pt-4",
        isCollapsed ? "px-2" : "px-6"
      )}>
        <div className={cn(
          "flex items-center",
          isCollapsed && "flex-col"
        )}>
          <Avatar className={cn(
            "bg-gradient-to-br from-[#E5133C] to-pink-600 text-white",
            isCollapsed ? "h-10 w-10" : "h-9 w-9"
          )}>
            <AvatarImage src={currentUser?.avatarUrl} alt={currentUser?.username} />
            <AvatarFallback>{getInitials(currentUser.firstName, currentUser.lastName)}</AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">{`${currentUser.firstName} ${currentUser.lastName}`}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
            </div>
          )}

          {!isCollapsed && (
            <div className="ml-auto flex gap-1">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600 h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-400 hover:text-gray-600 h-8 w-8"
                onClick={() => logoutMutation?.mutate()}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Mobile Sidebar (visible uniquement sur mobile)
  const mobileSidebar = (
    <div className={cn(
      "fixed inset-0 z-50 bg-black/50 md:hidden transition-all",
      mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
    )}>
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transition-transform",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {sidebarContent}
      </div>
    </div>
  );

  // Mobile Toggle Button (visible uniquement sur mobile)
  const mobileToggle = (
    <button
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#E5133C] shadow-lg text-white md:hidden"
      onClick={toggleMobileSidebar}
    >
      <MenuIcon className="h-6 w-6" />
    </button>
  );

  return (
    <>
      <div className={cn(
        "hidden md:flex bg-white border-r border-gray-100 h-screen transition-all duration-300 ease-in-out overflow-hidden",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {sidebarContent}
      </div>

      {mobileSidebar}
      {mobileToggle}
    </>
  );
}
