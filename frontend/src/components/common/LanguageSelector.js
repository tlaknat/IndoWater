import React from 'react';
import { useTranslation } from 'react-i18next';

const LanguageSelector = () => {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          id="language-menu"
          aria-expanded="true"
          aria-haspopup="true"
        >
          {t('common.language')}
          <svg
            className="-mr-1 ml-2 h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      <div
        className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 focus:outline-none"
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="language-menu"
      >
        <div className="py-1" role="none">
          <button
            onClick={() => changeLanguage('en')}
            className={`${
              i18n.language === 'en' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
            } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700`}
            role="menuitem"
          >
            English
          </button>
          <button
            onClick={() => changeLanguage('id')}
            className={`${
              i18n.language === 'id' ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'
            } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700`}
            role="menuitem"
          >
            Bahasa Indonesia
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageSelector;