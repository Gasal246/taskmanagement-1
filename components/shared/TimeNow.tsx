"use client"
import React from 'react'
import { useNow } from '@/hooks/useNow'

const TimeNow = () => {
    const now = new Date(useNow());
    let hours: any = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'pm' : 'am';

    hours = hours % 12 || 12;
    hours = hours.toString().padStart(2, '0');
    const time = `${hours}:${minutes}:${seconds} ${ampm}`;

    return (
        <span className='text-green-600 font-semibold time-font'>{time}</span>
    )
}

export default TimeNow
