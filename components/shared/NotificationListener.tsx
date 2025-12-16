/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { QUERY_KEYS } from '@/query/queryKeys';
import { useQueryClient } from '@tanstack/react-query';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useState } from 'react'
import { DefaultEventsMap, Socket } from 'socket.io';
import { io } from 'socket.io-client';
import { toast } from 'sonner';

function useSocket() {
  const [socketIo, setSocketIo] = useState(null);
  useEffect(() => {
    const socket: any = io(process.env.HOST_URL, {
      path: '/api/socket',
      transports: ["websocket"]
    });
    setSocketIo(socket)
    return () => {
      socket.disconnect();
    };
  }, []);
  return socketIo;

}

function PopNotification(message: string) {
  if (Notification.permission === 'granted') {
    console.log("Notifications permission granted.");
    new Notification(message, {
      icon: "/logo.png",
    });
  } else if (Notification.permission !== 'denied') {
    Notification.requestPermission().then((perm) => {
      console.log("Notification permission:", perm);
      if (perm === 'granted') {
        new Notification(message, {
          icon: "/logo.png",
        });
      } else {
        toast.info(message);
      }
    });
  } else {
    toast.info(message);
  }
}

const NotificationListener = () => {
  const { data: session }: any = useSession();
  const queryClient = useQueryClient()
  const [allMessages, setAllMessages] = useState<any[]>([]);

  const socket: any = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('connect', () => {
        console.log('connect');
        PopNotification("Connection...")
      });
      socket.on('disconnect', () => {
        console.log('disconnect');
      });
      socket.on("receive-message", (data: any) => {
        setAllMessages((pre) => [...pre, data]);
      });
    }

  }, [socket]);

  // useEffect(() => {
  //   socket.emit('joinChannel', `channel-${session?.user?.id}`);

  //   socket.on('connect', () => {
  //     console.log("Connected to Trigger Server");
  //   });

  //   socket.on('dep-name-changed', (message) => {
  //     toast.info(message);
  //     PopNotification(message);
  //   });

  //   socket.on('block-user', (message) => {
  //     toast.info(message);
  //     PopNotification(message);
  //     signOut();
  //   });

  //   socket.on('role-change', () => {
  //     queryClient.invalidateQueries({
  //       queryKey: [QUERY_KEYS.GET_ALL_NOTIFICATIONS]
  //     })
  //   })

  //   socket.on('trigger-finduserbyid', () => {
  //     queryClient.invalidateQueries({
  //       queryKey: [QUERY_KEYS.GET_USER_BY_ID]
  //     })
  //     queryClient.invalidateQueries({
  //       queryKey: [QUERY_KEYS.GET_STAFF]
  //     })
  //   })

  //   return () => {
  //     socket.off('dep-name-changed');
  //     socket.off('block-user');
  //   };
  // }, [session]);

  // RETURN NO HTML
  return null;
}

export default NotificationListener

