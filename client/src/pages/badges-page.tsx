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
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Plus, 
  Search, 
  Award,
  Users,
  Trophy,
  Medal,
  Sparkles,
  Loader2,
  Edit,
  Trash,
  Gift,
  CheckCircle,
  MessageSquare
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Types for badges and users
interface BadgeType {
  id: number;
  name: string;
  description: string;
  criteria: string;
  iconName: string;
  createdAt: number;
}

interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  role: string;
  avatarUrl?: string;
  points: number;
}

interface UserBadge {
  userBadgeId: number;
  badgeId: number;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  awardedAt: number;
}

// Form schema for creating/editing badges
const badgeFormSchema = z.object({
  name: z.string().min(3, {
    message: "Badge name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  criteria: z.string().min(5, {
    message: "Criteria must be at least 5 characters.",
  }),
  iconName: z.string().min(1, {
    message: "Icon name is required.",
  }),
});

// Form schema for awarding badges
const awardBadgeSchema = z.object({
  userId: z.number({
    required_error: "Please select a user",
  }),
  badgeId: z.number({
    required_error: "Please select a badge",
  }),
});

type BadgeFormValues = z.infer<typeof badgeFormSchema>;
type AwardBadgeFormValues = z.infer<typeof awardBadgeSchema>;

// Badge icon options
const badgeIcons = [
  { value: "award", label: "Award", icon: <Award className="h-4 w-4" /> },
  { value: "trophy", label: "Trophy", icon: <Trophy className="h-4 w-4" /> },
  { value: "medal", label: "Medal", icon: <Medal className="h-4 w-4" /> },
  { value: "sparkles", label: "Sparkles", icon: <Sparkles className="h-4 w-4" /> },
  { value: "gift", label: "Gift", icon: <Gift className="h-4 w-4" /> },
];

export default function BadgesPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("badges");
  const [isCreateBadgeDialogOpen, setIsCreateBadgeDialogOpen] = useState(false);
  const [isAwardBadgeDialogOpen, setIsAwardBadgeDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch badges
  const { data: badges, isLoading: isLoadingBadges } = useQuery<BadgeType[]>({
    queryKey: ["/api/badges"],
  });
  
  // Fetch users (for students only, to award badges)
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });
  
  // Only show students for awarding badges
  const students = users?.filter(user => user.role === "student") || [];
  
  // Fetch top students (for leaderboard)
  const { data: topStudents } = useQuery<User[]>({
    queryKey: ["/api/statistics/top-students", { limit: 10 }],
  });
  
  // Create badge mutation
  const createBadgeMutation = useMutation({
    mutationFn: async (badge: BadgeFormValues) => {
      const res = await fetch("/api/badges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...badge,
          createdAt: Date.now()
        }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create badge");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Badge created",
        description: "The badge has been created successfully.",
      });
      setIsCreateBadgeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/badges"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Award badge mutation
  const awardBadgeMutation = useMutation({
    mutationFn: async ({ userId, badgeId }: AwardBadgeFormValues) => {
      const res = await fetch(`/api/users/${userId}/badges`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ badgeId }),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to award badge");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Badge awarded",
        description: "The badge has been awarded successfully.",
      });
      setIsAwardBadgeDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/statistics/top-students"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Form for creating badges
  const badgeForm = useForm<BadgeFormValues>({
    resolver: zodResolver(badgeFormSchema),
    defaultValues: {
      name: "",
      description: "",
      criteria: "",
      iconName: "award",
    },
  });
  
  // Form for awarding badges
  const awardBadgeForm = useForm<AwardBadgeFormValues>({
    resolver: zodResolver(awardBadgeSchema),
  });
  
  // Handle badge create form submission
  const onBadgeSubmit = (data: BadgeFormValues) => {
    createBadgeMutation.mutate(data);
  };
  
  // Handle award badge form submission
  const onAwardBadgeSubmit = (data: AwardBadgeFormValues) => {
    awardBadgeMutation.mutate(data);
  };
  
  // Filter badges based on search term
  const filteredBadges = badges?.filter(badge => {
    return (
      badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      badge.criteria.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });
  
  // Get badge icon component
  const getBadgeIcon = (iconName: string) => {
    const icon = badgeIcons.find(icon => icon.value === iconName);
    return icon ? icon.icon : <Award className="h-4 w-4" />;
  };
  
  // Get user initials for avatar
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen flex flex-col">
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title="Badges & Points" />
        
        {/* Badges Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="badges">Badges</TabsTrigger>
                  <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
                  <TabsTrigger value="points">Points System</TabsTrigger>
                </TabsList>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  {activeTab === "badges" && (
                    <>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                        <Input
                          type="text"
                          placeholder="Search badges..."
                          className="pl-8"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      
                      <Dialog open={isCreateBadgeDialogOpen} onOpenChange={setIsCreateBadgeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Badge
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create New Badge</DialogTitle>
                            <DialogDescription>
                              Create a new badge that can be awarded to students.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Form {...badgeForm}>
                            <form onSubmit={badgeForm.handleSubmit(onBadgeSubmit)} className="space-y-4">
                              <FormField
                                control={badgeForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Badge Name</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., Perfect Attendance" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={badgeForm.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Description of the badge" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={badgeForm.control}
                                name="criteria"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Criteria</FormLabel>
                                    <FormControl>
                                      <Input placeholder="e.g., Attend 10 consecutive classes" {...field} />
                                    </FormControl>
                                    <FormDescription>
                                      The criteria students need to meet to earn this badge.
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={badgeForm.control}
                                name="iconName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Badge Icon</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select an icon" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {badgeIcons.map((icon) => (
                                          <SelectItem key={icon.value} value={icon.value}>
                                            <div className="flex items-center">
                                              {icon.icon}
                                              <span className="ml-2">{icon.label}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsCreateBadgeDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={createBadgeMutation.isPending}
                                >
                                  {createBadgeMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Plus className="mr-2 h-4 w-4" />
                                  )}
                                  Create Badge
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      
                      <Dialog open={isAwardBadgeDialogOpen} onOpenChange={setIsAwardBadgeDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline">
                            <Award className="mr-2 h-4 w-4" />
                            Award Badge
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Award Badge to Student</DialogTitle>
                            <DialogDescription>
                              Recognize a student's achievement by awarding a badge.
                            </DialogDescription>
                          </DialogHeader>
                          
                          <Form {...awardBadgeForm}>
                            <form onSubmit={awardBadgeForm.handleSubmit(onAwardBadgeSubmit)} className="space-y-4">
                              <FormField
                                control={awardBadgeForm.control}
                                name="userId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Student</FormLabel>
                                    <Select 
                                      onValueChange={(value) => field.onChange(parseInt(value))} 
                                      value={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a student" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {students.map((student) => (
                                          <SelectItem key={student.id} value={student.id.toString()}>
                                            {student.firstName} {student.lastName}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={awardBadgeForm.control}
                                name="badgeId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Badge</FormLabel>
                                    <Select 
                                      onValueChange={(value) => field.onChange(parseInt(value))} 
                                      value={field.value?.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select a badge" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        {badges?.map((badge) => (
                                          <SelectItem key={badge.id} value={badge.id.toString()}>
                                            <div className="flex items-center">
                                              {getBadgeIcon(badge.iconName)}
                                              <span className="ml-2">{badge.name}</span>
                                            </div>
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <DialogFooter>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setIsAwardBadgeDialogOpen(false)}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={awardBadgeMutation.isPending}
                                >
                                  {awardBadgeMutation.isPending ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Award className="mr-2 h-4 w-4" />
                                  )}
                                  Award Badge
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </div>
              
              {/* Badges Tab */}
              <TabsContent value="badges" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Badges</CardTitle>
                    <CardDescription>
                      Manage badges that can be awarded to students for their achievements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Badge</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Criteria</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingBadges ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={5} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : filteredBadges && filteredBadges.length > 0 ? (
                            filteredBadges.map((badge) => (
                              <TableRow key={badge.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 flex items-center justify-center rounded-full bg-primary-100 text-primary-700">
                                      {getBadgeIcon(badge.iconName)}
                                    </div>
                                    <span className="font-medium">{badge.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>{badge.description}</TableCell>
                                <TableCell>{badge.criteria}</TableCell>
                                <TableCell>{format(new Date(badge.createdAt), "MMM dd, yyyy")}</TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button variant="ghost" size="sm">
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit
                                    </Button>
                                    <Button variant="ghost" size="sm" className="text-red-600">
                                      <Trash className="mr-2 h-4 w-4" />
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-4 text-gray-500">
                                {searchTerm ? "No badges found matching your search" : "No badges found. Create your first badge to get started."}
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Leaderboard Tab */}
              <TabsContent value="leaderboard" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Student Leaderboard</CardTitle>
                    <CardDescription>
                      Rankings of students based on points and achievements
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-yellow-200 text-yellow-700 flex items-center justify-center">
                            <Trophy className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="text-sm text-yellow-700 font-medium">1st Place</p>
                            <p className="text-lg font-bold text-yellow-800">
                              {topStudents && topStudents.length > 0 
                                ? `${topStudents[0].firstName} ${topStudents[0].lastName}` 
                                : "No students yet"}
                            </p>
                            {topStudents && topStudents.length > 0 && (
                              <p className="text-sm text-yellow-700">
                                {topStudents[0].points} points
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center">
                            <Award className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-700 font-medium">2nd Place</p>
                            <p className="text-lg font-bold text-gray-800">
                              {topStudents && topStudents.length > 1 
                                ? `${topStudents[1].firstName} ${topStudents[1].lastName}` 
                                : "No student"}
                            </p>
                            {topStudents && topStudents.length > 1 && (
                              <p className="text-sm text-gray-700">
                                {topStudents[1].points} points
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                        <CardContent className="p-6 flex items-center gap-4">
                          <div className="h-14 w-14 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center">
                            <Medal className="h-7 w-7" />
                          </div>
                          <div>
                            <p className="text-sm text-orange-700 font-medium">3rd Place</p>
                            <p className="text-lg font-bold text-orange-800">
                              {topStudents && topStudents.length > 2 
                                ? `${topStudents[2].firstName} ${topStudents[2].lastName}` 
                                : "No student"}
                            </p>
                            {topStudents && topStudents.length > 2 && (
                              <p className="text-sm text-orange-700">
                                {topStudents[2].points} points
                              </p>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="rounded-md border overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Rank</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Badges</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Trend</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {isLoadingUsers ? (
                            Array.from({ length: 5 }).map((_, index) => (
                              <TableRow key={index}>
                                <TableCell colSpan={6} className="h-14">
                                  <div className="w-full h-4 bg-gray-200 rounded animate-pulse"></div>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : topStudents && topStudents.length > 0 ? (
                            topStudents.map((student, index) => (
                              <TableRow key={student.id}>
                                <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9">
                                      <AvatarFallback className="bg-primary-100 text-primary-700">
                                        {getInitials(student.firstName, student.lastName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <span className="font-medium">{student.firstName} {student.lastName}</span>
                                      <p className="text-sm text-gray-500">{student.username}</p>
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {Array.from({ length: Math.min(3, Math.floor(student.points / 300)) }).map((_, i) => (
                                      <div key={i} className="h-6 w-6 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                        <Medal className="h-3 w-3" />
                                      </div>
                                    ))}
                                    {Math.floor(student.points / 300) === 0 && (
                                      <span className="text-gray-500 text-sm">No badges yet</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="font-semibold">{student.points} pts</TableCell>
                                <TableCell>
                                  <div className="flex items-center text-green-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    </svg>
                                    {index === 0 ? "12%" : index === 1 ? "8%" : index === 2 ? "15%" : index === 3 ? "-3%" : "7%"}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => {
                                      awardBadgeForm.setValue("userId", student.id);
                                      setIsAwardBadgeDialogOpen(true);
                                    }}
                                  >
                                    <Award className="mr-2 h-4 w-4" />
                                    Award Badge
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                                No students found in the leaderboard
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Points System Tab */}
              <TabsContent value="points" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Points System</CardTitle>
                    <CardDescription>
                      Overview of how points are awarded and used in the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Points Earned</h3>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                <CheckCircle className="h-4 w-4" />
                              </div>
                              <span>Class Attendance</span>
                            </div>
                            <Badge variant="outline" className="font-semibold">+10 points</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                <MessageSquare className="h-4 w-4" />
                              </div>
                              <span>Telegram Message</span>
                            </div>
                            <Badge variant="outline" className="font-semibold">+1 point</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                <Award className="h-4 w-4" />
                              </div>
                              <span>Badge Award</span>
                            </div>
                            <Badge variant="outline" className="font-semibold">+50 points</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                <Trophy className="h-4 w-4" />
                              </div>
                              <span>Perfect Weekly Attendance</span>
                            </div>
                            <Badge variant="outline" className="font-semibold">+25 points</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                                <Users className="h-4 w-4" />
                              </div>
                              <span>Bringing New Student</span>
                            </div>
                            <Badge variant="outline" className="font-semibold">+100 points</Badge>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Badge Requirements</h3>
                        <div className="space-y-3">
                          {badges?.map((badge) => (
                            <div key={badge.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
                                  {getBadgeIcon(badge.iconName)}
                                </div>
                                <div>
                                  <span className="font-medium">{badge.name}</span>
                                  <p className="text-xs text-gray-500">{badge.criteria}</p>
                                </div>
                              </div>
                              <Badge className="font-semibold bg-primary-100 text-primary-700 hover:bg-primary-100">
                                +50 points
                              </Badge>
                            </div>
                          ))}
                          
                          {(!badges || badges.length === 0) && (
                            <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                              No badges have been created yet. Create badges to establish requirements.
                            </div>
                          )}
                        </div>
                        
                        <div className="mt-8">
                          <h3 className="text-lg font-semibold mb-4">Achievement Levels</h3>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                  <span className="font-semibold">I</span>
                                </div>
                                <span>Beginner</span>
                              </div>
                              <Badge variant="outline" className="font-semibold">0-500 points</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center">
                                  <span className="font-semibold">II</span>
                                </div>
                                <span>Intermediate</span>
                              </div>
                              <Badge variant="outline" className="font-semibold">501-1500 points</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                                  <span className="font-semibold">III</span>
                                </div>
                                <span>Advanced</span>
                              </div>
                              <Badge variant="outline" className="font-semibold">1501-3000 points</Badge>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                                  <span className="font-semibold">IV</span>
                                </div>
                                <span>Expert</span>
                              </div>
                              <Badge variant="outline" className="font-semibold">3001+ points</Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
