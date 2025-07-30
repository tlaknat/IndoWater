import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-indigo-600 dark:text-indigo-400">404</h1>
        <h2 className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('common.notFound')}
        </h2>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
          {t('common.pageNotFound')}
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button variant="primary" size="lg">
              {t('common.goHome')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;