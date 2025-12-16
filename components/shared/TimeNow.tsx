"use client"
import React, { useEffect, useState } from 'react'

const TimeNow = () => {
    const [time, setTime] = useState('');

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            let hours: any = now.getHours();
            const minutes = now.getMinutes().toString().padStart(2, '0');
            const seconds = now.getSeconds().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';

            hours = hours % 12 || 12;
            hours = hours.toString().padStart(2, '0');

            setTime(`${hours}:${minutes}:${seconds} ${ampm}`);
        };

        const intervalId = setInterval(updateClock, 1000);

        return () => clearInterval(intervalId);
    }, []);

    return (
        <span className='text-green-600 font-semibold time-font'>{time}</span>
    )
}

export default TimeNow
