import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ForgotPasswordForm from '../../components/auth/ForgotPasswordForm';
import LanguageSelector from '../../components/common/LanguageSelector';
import ThemeToggle from '../../components/common/ThemeToggle';

const ForgotPasswordPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-0 right-0 mt-4 mr-4 flex space-x-2">
        <LanguageSelector />
        <ThemeToggle />
      </div>
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link to="/">
          <img
            className="mx-auto h-12 w-auto"
            src="/logo.png"
            alt="IndoWater"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          {t('app.title')}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          {t('app.description')}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <ForgotPasswordForm />
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          &copy; {new Date().getFullYear()} IndoWater. {t('app.footer')}
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;