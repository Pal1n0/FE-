// src/pages/DashboardPage.tsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useUIStore from '@/store/useUIStore';

const DashboardPage = () => {
  const { t } = useTranslation();


  useEffect(() => {
    document.title = t('dashboard.title');
  }, [t]);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">{t('dashboard.title')}</h1>
      <p>{t('dashboard.content')}</p>
    </div>
  );
};

export default DashboardPage;
