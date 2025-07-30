import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

const Footer = () => {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white dark:bg-gray-800 shadow">
      <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              &copy; {currentYear} IndoWater. {t('app.footer')}
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link
              to="/terms"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            >
              {t('common.terms')}
            </Link>
            <Link
              to="/privacy"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            >
              {t('common.privacy')}
            </Link>
            <Link
              to="/help"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            >
              {t('common.help')}
            </Link>
            <Link
              to="/contact"
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
            >
              {t('common.contact')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;