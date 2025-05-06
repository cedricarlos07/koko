import { cva, type VariantProps } from "class-variance-authority";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";

const iconVariants = cva(
  "h-12 w-12 rounded-lg flex items-center justify-center",
  {
    variants: {
      variant: {
        primary: "bg-primary-100 text-primary-600",
        secondary: "bg-secondary-100 text-secondary-600",
        blue: "bg-blue-100 text-blue-600",
        cyan: "bg-cyan-100 text-cyan-600"
      }
    },
    defaultVariants: {
      variant: "primary"
    }
  }
);

interface StatsCardProps extends VariantProps<typeof iconVariants> {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  changeValue?: number;
  changePeriod?: string;
}

export default function StatsCard({
  title,
  value,
  icon,
  variant,
  changeValue,
  changePeriod = "Since last month"
}: StatsCardProps) {
  const isPositive = changeValue !== undefined ? changeValue >= 0 : false;
  
  return (
    <Card className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        </div>
        <div className={iconVariants({ variant })}>
          {icon}
        </div>
      </div>
      
      {changeValue !== undefined && (
        <div className="flex items-center mt-3">
          <span className={`text-sm font-medium flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <ArrowUp className="mr-1 h-3 w-3" />
            ) : (
              <ArrowDown className="mr-1 h-3 w-3" />
            )}
            {Math.abs(changeValue)}%
          </span>
          <span className="text-xs text-gray-500 ml-2">{changePeriod}</span>
        </div>
      )}
    </Card>
  );
}
