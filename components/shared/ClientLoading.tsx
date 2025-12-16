"use client"

import { useState, useEffect } from 'react';
import LoaderSpin from './LoaderSpin';
import { useRouter } from 'next/router';

const ClientLoading = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleRouteChangeStart = () => setLoading(true);
    const handleRouteChangeComplete = () => setLoading(false);
    const handleRouteChangeError = () => setLoading(false);

    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router]);

  return loading ? <div className="h-screen w-full justify-center items-center flex">
    <LoaderSpin size={80} />
  </div> : null;  // Customize this with your spinner
};

export default ClientLoading;
