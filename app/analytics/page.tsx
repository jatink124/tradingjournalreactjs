'use client';

import { useRouter } from 'next/navigation';
import { useGlobal } from '../context/GlobalContext';
import { useEffect } from 'react';
import AdvancedAnalytics from '../components/AdvancedAnalytics';

export default function AnalyticsPage() {
    const router = useRouter();
    const { isAuthenticated } = useGlobal();

    useEffect(() => {
        if (!isAuthenticated) router.push('/');
    }, [isAuthenticated, router]);

    return <AdvancedAnalytics />;
}
