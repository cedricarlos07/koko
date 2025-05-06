import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Medal } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface TopStudent {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  points: number;
  badgeCount: number;
}

export default function TopStudents() {
  const [timeRange, setTimeRange] = useState("week");
  
  const { data: topStudents, isLoading } = useQuery<TopStudent[]>({
    queryKey: ["/api/statistics/top-students"],
  });
  
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };
  
  const getAvatarColor = (index: number) => {
    const colors = [
      "bg-primary-100 text-primary-700",
      "bg-secondary-100 text-secondary-700",
      "bg-indigo-100 text-indigo-700",
      "bg-red-100 text-red-700",
      "bg-green-100 text-green-700"
    ];
    
    return colors[index % colors.length];
  };
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-5 h-full">
      <CardHeader className="p-0 pb-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-800">Top Students</CardTitle>
          <Select 
            defaultValue={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px] h-8 px-3 text-sm bg-gray-100 border-0">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center">
              <div className="w-8 text-center">
                <Skeleton className="h-6 w-6 mx-auto" />
              </div>
              <div className="ml-3 flex-shrink-0">
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
              <div className="ml-4 flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 mt-1" />
              </div>
              <div className="text-right">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 mt-1 ml-auto" />
              </div>
            </div>
          ))
        ) : topStudents && topStudents.length > 0 ? (
          topStudents.map((student, index) => (
            <div key={student.id} className="flex items-center">
              <div className="w-8 text-center">
                <span className="text-lg font-bold text-gray-800">{index + 1}</span>
              </div>
              <div className="ml-3 flex-shrink-0">
                <Avatar className={`h-10 w-10 ${getAvatarColor(index)}`}>
                  <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                </Avatar>
              </div>
              <div className="ml-4 flex-1">
                <h4 className="text-sm font-medium text-gray-800">{`${student.firstName} ${student.lastName}`}</h4>
                <div className="flex items-center mt-1">
                  <div className="flex">
                    {Array.from({ length: Math.min(student.badgeCount, 3) }).map((_, i) => (
                      <Medal key={i} className="h-4 w-4 text-yellow-500 mr-1" />
                    ))}
                  </div>
                  <span className="text-xs text-gray-500 ml-2">{student.badgeCount} badge{student.badgeCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{student.points} points</p>
                <div className="flex items-center justify-end mt-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-green-600">
                    {index === 0 ? "12%" : index === 1 ? "8%" : index === 2 ? "15%" : index === 3 ? "-3%" : "7%"}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-gray-500 py-6">
            <Medal className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No student ranking data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
