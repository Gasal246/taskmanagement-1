"use client"
import React, { useEffect, useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from 'next/navigation';
import { CalendarPlus, ListTodo } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { DatePicker, Space } from 'antd';
import { Button } from '@/components/ui/button';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { useGetAllTasks } from '@/query/business/queries';
import LoaderSpin from '@/components/shared/LoaderSpin';
const { RangePicker } = DatePicker;

const taskTypes = [
  { value: 'all', label: 'All Tasks' },
  { value: "project", label: 'Project Tasks' },
  { value: "single", label: 'Single Tasks' }
]

const TasksPage = () => {
  const router = useRouter();
  const { businessData } = useSelector((state: RootState) => state.user);
  const [selectedTaskType, setSelectedTaskType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [filters, setFilters] = useState<Record<string, string | undefined>>({});
  const {data:tasks, isLoading, refetch} = useGetAllTasks(filters);
  const handleDateChange = (dates: any, dateStrings: any) => {
    setStartDate(dateStrings[0]);
    setEndDate(dateStrings[1]);
  };

  useEffect(()=> {
    console.log("fetched tasks ", tasks);
  },[tasks])

  const handleSearchTasks = async () => {
    try {
      setFilters({
        business_id: businessData?._id,
        type: selectedTaskType,
        startDate,
        endDate,
      });
    } catch (err) {
      console.log(err);
    }
  };

  const handleClearFilters = () => {
    setSelectedTaskType('');
    setStartDate('');
    setEndDate('');
    setFilters({ business_id: businessData?._id });
  };

  useEffect(() => {
    console.log("Tasks data updated:", tasks);
  }, [tasks]);

  return (
    <div className='p-4 pb-20'>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg mb-2 flex justify-between items-center">
        <h1 className='font-semibold text-sm text-slate-300 flex items-center gap-1'>
          <ListTodo size={16} /> Business Tasks
        </h1>
          <Button className='flex items-center gap-1' onClick={() => router.push('/admin/tasks/addtask')}>
            Add Task <CalendarPlus size={16} />
          </Button>

        {startDate && endDate && (
          <div className="flex items-center gap-2">
            <p className="text-xs text-slate-400">From: {startDate}</p>
            <p className="text-xs text-slate-400">To: {endDate}</p>
          </div>
        )}
      </div>
      <div className="bg-gradient-to-tr from-slate-950/50 to-slate-900/50 p-3 rounded-lg min-h-[13vh] mb-2">
        <h1 className='font-semibold text-xs text-slate-400 px-2'>Task Filters</h1>
        <div className='flex flex-wrap'>
          <div className="w-full lg:w-4/12 p-1">
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
          <div className="w-full lg:w-4/12 p-1">
            <div className="bg-gradient-to-br from-slate-950/50 to-slate-900/50 rounded-lg p-0.5 px-1">
              <Label className='text-xs text-slate-400 px-2'>Within Period</Label>
              <Space direction="vertical" size={12} style={{ width: '100%', border: 0 }} className='placeholder:text-white'>
                <RangePicker onChange={handleDateChange} style={{ backgroundColor: '#1d293d', width: '100%', border: 0 }} className='text-white' />
              </Space>
            </div>
          </div>
          <div className="w-full lg:w-4/12 p-1 flex gap-2 justify-start items-center">
            <Button variant='ghost' className='text-xs' onClick={handleClearFilters}>Clear All</Button>
            <Button onClick={handleSearchTasks} className='text-xs '>Apply / Search</Button>
          </div>
        </div>
      </div>
      <div className="bg-slate-900/50 p-4 rounded-xl shadow-sm min-h-[13vh]">
        <h1 className="font-semibold text-sm text-slate-300 flex items-center gap-2 mb-3">
          <ListTodo size={16} /> Business Tasks
        </h1>
        {isLoading && (
          <div className="flex items-center justify-center w-full h-[15vh]">
              <LoaderSpin size={20} title="Loading Tasks..." />
            </div>
        )}
        {tasks?.data?.length === 0 && !isLoading && (
          <p className="text-xs text-slate-500 italic">No tasks found.</p>
        )}
        <div className="space-y-2">
          {tasks?.data?.map((task: any) => (
            <div
              key={task._id}
              className="p-3 border border-slate-700 rounded-lg hover:bg-slate-800/60 transition cursor-pointer"
              onClick={() => router.push(`/admin/tasks/${task._id}`)}
            >
              <h2 className="text-md font-medium text-slate-200 truncate">
                {task.task_name}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
  {/* Status Tag */}
  <span
    className={`
      px-2 py-1 rounded-md capitalize
      font-semibold
      ${
        task.status === "Completed"
          ? "bg-green-100 text-green-700"
          : task.status === "In Progress"
          ? "bg-yellow-100 text-yellow-700"
          : task.status === "To Do"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-600"
      }
    `}
  >
    {task.status}
  </span>

  {/* Progress Tag */}
  <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-700 capitalize">
    Progress: {task.activity_count ? Math.round((task.completed_activity / task.activity_count) * 100) : 0}%
  </span>

  {/* Date Tag */}
  <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600">
    Start: {task.start_date ? new Date(task.start_date).toLocaleDateString() : "N/A"} • 
    End: {task.end_date ? new Date(task.end_date).toLocaleDateString() : "N/A"}
  </span>
</div>

            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TasksPage