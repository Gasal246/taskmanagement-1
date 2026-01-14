"use client"

import { formatDate, formatDateShortly, formatDateTiny, formatNumber } from "@/lib/utils"
import { ColumnDef, Row } from "@tanstack/react-table"
import { Avatar, Tooltip } from "antd"
import { ArrowDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

interface CountdownCellProps {
  row: Row<any>;
}

const CountdownCell: React.FC<CountdownCellProps> = ({ row }) => {
  const deadline = row.original?.task?.Deadline; // ISO date string
  const [timeLeft, setTimeLeft] = useState<string>(''); // Type the state as a string
  const [isLessThanFiveHours, setIsLessThanFiveHours] = useState<boolean>(false); // State to track if less than 5 hours

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const endTime = new Date(deadline);
      const diffInSeconds = Math.floor((endTime.getTime() - now.getTime()) / 1000); // Time difference in seconds
      if (diffInSeconds <= 0) {
        clearInterval(interval); // Stop updating if the deadline has passed
        setTimeLeft('Expired');
        setIsLessThanFiveHours(false); // Reset color when expired
      } else {
        const days = Math.floor(diffInSeconds / (24 * 3600));
        const hours = Math.floor((diffInSeconds % (24 * 3600)) / 3600);
        const minutes = Math.floor((diffInSeconds % 3600) / 60);
        const seconds = diffInSeconds % 60;

        setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        // Check if remaining time is less than 5 hours
        setIsLessThanFiveHours(hours < 5);
      }
    }, 1000);

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [deadline]);
  // Conditional class for text color
  const textColorClass = isLessThanFiveHours ? 'text-red-600' : 'text-green-600';

  return (
    <Tooltip title={<h3 className="text-xs text-yellow-600">{formatDate(deadline)}</h3>}>
      <div className="w-[250px] bg-slate-950 rounded-full p-2">
        <h1 className={`text-xs font-medium text-center flex items-center justify-center gap-1 ${textColorClass}`}><ArrowDown size={14} /> {timeLeft}</h1>
      </div>
    </Tooltip>
  );
};

export const columns: ColumnDef<any>[] = [
  {
    accessorKey: "staff",
    header: "Staff With Task",
    cell: ({ row }) => {
      const data: any = row.getValue("staff");
      return (
        <Tooltip fresh title={
          <div className="flex gap-1 flex-wrap">
            {data?.Skills?.map((skill: string) => (
              <h1 key={skill} className="text-xs bg-slate-700 rounded-full px-2 text-slate-200">{skill}</h1>
            ))}
          </div>
        }>
          <div className="flex gap-1 items-center w-[250px] bg-slate-950 rounded-lg p-2 select-none cursor-pointer">
            <Avatar src={data?.avatar_url || '/avatar.png'} />
            <div className="">
              <h1 className="text-xs leading-3">{data?.Name}</h1>
              <h1 className="text-xs">{data?.Email}</h1>
              <h1 className="text-xs bg-slate-400 font-medium text-black rounded-full px-2 mt-1">{`${data?.Region}, ${data?.Area}`}</h1>
            </div>
          </div>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "task",
    header: "Task Assigned",
    cell: ({ row }) => {
      const data: any = row.getValue("task");
      const completedActivitiesCount = data?.Activities.filter((activity: any) => activity.Completed).length;
      return (
        <Tooltip title={data?.TaskName}>
          <Link href={`/admin/tasks/${data?._id}`} >
            <div className="w-[250px] bg-slate-950 rounded-lg p-2 select-none cursor-pointer">
              <h1 className="text-xs font-medium uppercase truncate">{data?.TaskName}</h1>
              <div className="flex gap-1 justify-between mt-1">
                <h1 className={`${data?.Priority == 'high' ? 'bg-red-400/40' : (data?.Priority == 'medium' ? 'bg-orange-400/40' : 'bg-slate-400/60')} flex items-center justify-center w-full text-center capitalize text-slate-300 text-xs rounded-full px-2`}>{data?.Priority}</h1>
                <h1 className="bg-slate-800 text-cyan-500 w-full text-xs text-center flex items-center justify-center rounded-full px-2">T: {`[${formatNumber(data?.Activities?.length)}]`}</h1>
                <h1 className="bg-slate-800 text-cyan-500 w-full text-xs text-center flex items-center justify-center rounded-full px-2">C: {`[${formatNumber(completedActivitiesCount)}]`}</h1>
              </div>
            </div>
          </Link>
        </Tooltip>
      )
    },
  },
  {
    accessorKey: "task.Deadline",
    header: "Ends In",
    cell: ({ row }) => {
      return (
        <CountdownCell row={row} />
      )
    },
  },
]
