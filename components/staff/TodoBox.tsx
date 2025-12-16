import React from 'react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Plus } from 'lucide-react'
import { Checkbox } from '../ui/checkbox'

const TodoBox = () => {
    return (
        <div className='w-[300px] h-[370px] border-2 rounded-lg border-slate-600 bg-slate-950/60 p-2 relative hover:bg-slate-950/40'>
            <div className='mb-2'>
                <h1 className='text-sm font-semibold leading-4'>ToDo</h1>
                <h2 className='text-xs text-slate-300'>This feature is only run locally now (beta).</h2>
            </div>
            <div className="h-[270px] w-full overflow-y-scroll">
                <div className="flex gap-1 items-center">
                    <Input placeholder='Add to ToDo..' />
                    <Button><Plus /></Button>
                </div>
                <div className="flex flex-col gap-1 mt-2">
                    <div className="border border-slate-600 rounded-lg p-1 flex gap-2 items-center border-dashed">
                        <Checkbox />
                        <div>
                            <h1 className='text-sm font-medium text-slate-200 leading-3'>Activity Name</h1>
                            <h4 className='text-xs text-slate-400 flex items-center gap-2 leading-3'>just now <span className='text-xs font-medium underline cursor-pointer text-destructive'>del?</span></h4>
                        </div>
                    </div>
                </div>
            </div>
            <div className='absolute bottom-0 left-0 w-full p-2 flex justify-between gap-1'>
                <h1 className='text-sm font-semibold text-slate-200 p-1 px-2 bg-slate-950 rounded-lg border border-slate-700'>Completed: {2}</h1>
                <h1 className='text-sm font-semibold text-slate-200 p-1 px-2 bg-slate-950 rounded-lg border border-slate-700'>Pending: {2}</h1>
            </div>
        </div>
    )
}

export default TodoBox