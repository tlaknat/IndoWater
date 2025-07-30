import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import Button from '../components/common/Button';
import LanguageSelector from '../components/common/LanguageSelector';
import ThemeToggle from '../components/common/ThemeToggle';

const Dashboard = () => {
  const { t } = useTranslation();
  const { user, logout, isSuperAdmin, isClient, isCustomer } = useAuth();
  const { theme } = useTheme();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('dashboard.welcome')}
          </h1>
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            <ThemeToggle />
            <Button
              variant="light"
              size="sm"
              onClick={handleLogout}
            >
              {t('common.logout')}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            {t('dashboard.summary')}
          </h2>
          
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300">
              {t('common.welcome')}, <span className="font-semibold">{user?.name}</span>!
            </p>
            <p className="text-gray-700 dark:text-gray-300">
              {t('common.role')}: <span className="font-semibold">{t(`common.${user?.role}`)}</span>
            </p>
          </div>
          
          {isSuperAdmin() && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('superadmin.clientManagement.title')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {t('superadmin.clientManagement.subtitle')}
              </p>
              <div className="mt-4">
                <Button variant="primary" size="md">
                  {t('superadmin.clientManagement.createClient')}
                </Button>
              </div>
            </div>
          )}
          
          {isClient() && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('client.tariff.title')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {t('client.tariff.subtitle')}
              </p>
              <div className="mt-4">
                <Button variant="primary" size="md">
                  {t('client.tariff.createTariff')}
                </Button>
              </div>
            </div>
          )}
          
          {isCustomer() && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('customer.topup.title')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {t('customer.topup.subtitle')}
              </p>
              <div className="mt-4">
                <Button variant="primary" size="md">
                  {t('customer.topup.topupButton')}
                </Button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('dashboard.quickActions')}
              </h3>
              <ul className="space-y-2">
                <li>
                  <Button variant="link" size="sm">
                    {t('common.profile')}
                  </Button>
                </li>
                <li>
                  <Button variant="link" size="sm">
                    {t('common.settings')}
                  </Button>
                </li>
                <li>
                  <Button variant="link" size="sm">
                    {t('common.help')}
                  </Button>
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('dashboard.recentActivity')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {t('common.noData')}
              </p>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {t('dashboard.notifications')}
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                {t('common.noData')}
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-white dark:bg-gray-800 shadow mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} IndoWater. {t('app.footer')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;