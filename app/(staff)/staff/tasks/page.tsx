'use client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Space, DatePicker } from 'antd';
import { ListTodo, Clock, CheckCircle2, AlertCircle, CalendarPlus } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useGetAllStaffTasks } from '@/query/business/queries';
import { useRouter } from 'next/navigation';
import Cookies from "js-cookie";
import { toast } from 'sonner';
const { RangePicker } = DatePicker;

interface Task {
  id: string;
  title: string;
  type: 'project' | 'single';
  status: 'pending' | 'completed';
  dueDate: string;
}

const taskTypes = [
  { value: 'all', label: 'All Tasks' },
  { value: 'project', label: 'Project Tasks' },
  { value: 'single', label: 'Single Tasks' },
];

const StaffTasks = () => {
    const router = useRouter();
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const [canAdd, setCanAdd] = useState(false);
  const {data: tasks, isLoading, refetch} = useGetAllStaffTasks(filters);

  const fetchCookies = () => {
    const roleCookies = Cookies.get("user_role");
    if(!roleCookies) return toast.error("Cookies not available");
    const roleJson = JSON.parse(roleCookies);
    setCanAdd(roleJson.role_name.endsWith("HEAD"));
  }

  useEffect(()=>{
    fetchCookies();
  },[]);

  const handleDateChange = (dates: any, dateStrings: any) => {
    setStartDate(dateStrings[0]);
    setEndDate(dateStrings[1]);
  };

  const handleClearFilters = () => {
    setSelectedTaskType('');
    setStartDate('');
    setEndDate('');
    setFilters({});
  };

  const handleSearchTasks = () => {
    setFilters({
      taskType: selectedTaskType || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const filteredTasks = tasks?.data?.filter((task:any) => {
    const matchesTaskType = selectedTaskType === 'all' || !selectedTaskType || task.type === selectedTaskType;
    const matchesDate =
      !startDate ||
      !endDate ||
      (new Date(task.dueDate) >= new Date(startDate) && new Date(task.dueDate) <= new Date(endDate));
    return matchesTaskType && matchesDate;
  });

  const navigateToTask = (id:string) => {
    router.push(`/staff/tasks/${id}`);
  }

  return (
    <div className="p-4 pb-20">
      {/* Custom CSS for DatePicker */}
      <style jsx global>{`
        /* Ensure the date picker dropdown stays within viewport */
        .ant-picker-dropdown {
          max-width: 100vw !important;
          width: auto !important;
          min-width: 250px !important;
          box-sizing: border-box;
          padding: 0 8px;
        }

        /* Adjust dropdown for mobile */
        @media (max-width: 640px) {
          .ant-picker-dropdown {
            left: 8px !important;
            right: 8px !important;
            width: calc(100vw - 16px) !important;
            transform: translateX(0) !important;
          }

          /* Ensure the calendar panels fit */
          .ant-picker-panel-container {
            overflow-x: auto;
            max-width: 100%;
          }

          .ant-picker-panel {
            width: 100%;
            min-width: 0;
          }

          /* Adjust date cells for smaller screens */
          .ant-picker-cell {
            padding: 2px !important;
          }

          .ant-picker-date-panel {
            width: 100% !important;
          }
        }

        /* Fix RangePicker input styling */
        .ant-picker-range {
          width: 100% !important;
          background-color: #1d293d !important;
          border: none !important;
          color: white !important;
        }

        .ant-picker-input > input {
          color: white !important;
          font-size: 12px !important;
        }

        .ant-picker-input > input::placeholder {
          color: #94a3b8 !important;
        }
      `}</style>

      {/* Filter Section */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2 flex justify-between items-center">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <ListTodo size={16} /> Tasks
        </h1>
        {canAdd && (
          <Button className='flex items-center gap-1' onClick={() => router.push('/staff/tasks/add-task')}>
                      Add Task <CalendarPlus size={16} />
                    </Button>
        )}
      </div>

      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[13vh] mb-4">
        <h1 className="font-semibold text-xs text-slate-400 px-2">Task Filters</h1>
        <div className="flex flex-col sm:flex-row flex-wrap gap-2">
          <div className="w-full sm:w-1/3 min-w-[200px]">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg">
              <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
                <SelectTrigger className={`${selectedTaskType ? 'text-slate-200' : 'text-slate-400'}`}>
                  <SelectValue placeholder="Select Task Type" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="w-full sm:w-1/3 min-w-[200px]">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-0.5 px-1">
              <Label className="text-xs text-slate-400 px-2">Within Period</Label>
              <Space direction="vertical" size={12} style={{ width: '100%', border: 0 }}>
                <RangePicker
                  onChange={handleDateChange}
                  style={{ backgroundColor: '#1d293d', width: '100%', border: 0 }}
                  className="text-white"
                  popupStyle={{ zIndex: 9999 }}
                  getPopupContainer={(trigger) => trigger.parentNode as HTMLElement}
                />
              </Space>
            </div>
          </div>
          <div className="w-full sm:w-1/3 min-w-[200px] flex gap-2 justify-start items-end">
            <Button variant="ghost" className="text-xs" onClick={handleClearFilters}>
              Clear All
            </Button>
            <Button onClick={handleSearchTasks} className="text-xs">
              Apply / Search
            </Button>
          </div>
        </div>
      </div>

      {/* Task List Section */}
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2">
        <h2 className="font-semibold text-sm text-slate-300 flex items-center gap-1">
          <Clock size={16} /> Task List
        </h2>
      </div>
      <div className="space-y-3">
        {filteredTasks?.length > 0 ? (
          filteredTasks?.map((task:any) => (
            <Card
              onClick={()=> navigateToTask(task?._id)}
              key={task._id}
              className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 p-4 rounded-lg border-none hover:bg-slate-900/70 transition-colors duration-200"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-slate-200">{task.task_name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={task?.is_project_task ? 'default' : 'secondary'}
                      className={`text-xs ${
                        task?.is_project_task ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {/* {task?.type?.charAt(0).toUpperCase() + task.type.slice(1)} */}
                      {task?.is_project_task ? "Project Task" : "Single Task"}
                    </Badge>
                    <span className="text-xs text-slate-400">Due: {new Date(task?.end_date).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {task.status === 'Completed' ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-yellow-500" />
                  )}
                  <span className={`text-xs ${task?.status === 'Completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                    {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                  </span>
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-center text-sm text-slate-400">No tasks match the selected filters.</div>
        )}
      </div>
    </div>
  );
};

export default StaffTasks;