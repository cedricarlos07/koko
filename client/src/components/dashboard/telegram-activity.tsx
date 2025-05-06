import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { FaTelegram } from "react-icons/fa";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

interface TelegramGroupStat {
  courseId: number;
  courseName: string;
  courseLevel: string;
  memberCount: number;
  messageCount: number;
  groupLink: string;
}

export default function TelegramActivity() {
  const [timeRange, setTimeRange] = useState("7days");
  
  const { data: telegramStats, isLoading } = useQuery<TelegramGroupStat[]>({
    queryKey: ["/api/telegram/stats"],
  });
  
  // Function to calculate activity percentage
  const calculateActivity = (messages: number, members: number) => {
    if (members === 0) return 0;
    
    // Average messages per student - let's say 20 messages per week is 100% activity
    const maxExpectedMessages = members * 20;
    const percentage = (messages / maxExpectedMessages) * 100;
    
    // Cap at 100%
    return Math.min(Math.round(percentage), 100);
  };
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-5 h-full">
      <CardHeader className="p-0 pb-5">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-gray-800">Telegram Group Activity</CardTitle>
          <Select 
            defaultValue={timeRange} 
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px] h-8 px-3 text-sm bg-gray-100 border-0">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 days</SelectItem>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="90days">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0 space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border border-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Skeleton className="w-10 h-10 rounded-md" />
                  <div className="ml-3">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16 mt-1" />
                  </div>
                </div>
                <div className="text-right">
                  <Skeleton className="h-4 w-24 ml-auto" />
                  <Skeleton className="h-3 w-16 mt-1 ml-auto" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Activity</span>
                  <Skeleton className="h-3 w-8" />
                </div>
                <Skeleton className="h-2 w-full mt-1" />
              </div>
            </div>
          ))
        ) : telegramStats && telegramStats.length > 0 ? (
          <>
            {telegramStats.map((group) => {
              const activityPercentage = calculateActivity(group.messageCount, group.memberCount);
              
              return (
                <div key={group.courseId} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="bg-blue-100 w-10 h-10 rounded-md flex items-center justify-center text-blue-600">
                        <FaTelegram className="h-5 w-5" />
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-gray-800">{group.courseName} Group</h4>
                        <p className="text-xs text-gray-500">{group.memberCount} members</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-800">{group.messageCount} messages</p>
                      <p className={`text-xs ${
                        group.messageCount > 100 ? "text-green-600" : "text-gray-500"
                      }`}>
                        {group.messageCount > 100 ? "+18% vs last week" : "Activity tracked"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                      <span>Activity</span>
                      <span>{activityPercentage}%</span>
                    </div>
                    <Progress value={activityPercentage} className="h-2" />
                  </div>
                </div>
              );
            })}
            
            <Link href="/telegram">
              <Button className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 rounded-lg h-auto font-normal">
                View All Groups
              </Button>
            </Link>
          </>
        ) : (
          <div className="text-center text-gray-500 py-6">
            <FaTelegram className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>No Telegram groups activity found</p>
            <Link href="/telegram">
              <Button variant="link" className="mt-2">
                Set up Telegram integration
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
