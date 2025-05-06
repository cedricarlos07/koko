import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Bell, ChevronDown, Search, Menu, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "./sidebar";

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  if (!user) return null;
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };
  
  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center">
          <span className="text-primary-600 font-bold text-xl">KODJO</span>
          <span className="text-secondary-500 font-bold text-xl ml-1">ENGLISH</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggleMobileMenu}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
      
      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-50 overflow-y-auto pt-16">
          <Sidebar />
        </div>
      )}
      
      {/* Desktop Header */}
      <header className="bg-white shadow-sm p-4 hidden md:block">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative">
              <Input 
                type="text" 
                placeholder="Search..." 
                className="bg-gray-100 rounded-lg py-2 px-4 text-sm w-64" 
              />
              <Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            
            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8 bg-primary-200 text-primary-700">
                    <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-gray-700">{user.firstName}</span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>Your Profile</DropdownMenuItem>
                <DropdownMenuItem>Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600" 
                  onClick={() => logoutMutation.mutate()}
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
    </>
  );
}
