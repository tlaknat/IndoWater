import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../utils/AuthContext';

const Sidebar = ({ isMobileMenuOpen, setIsMobileMenuOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, isSuperAdmin, isClient, isCustomer } = useAuth();
  const [isSubmenuOpen, setIsSubmenuOpen] = useState({});

  const toggleSubmenu = (key) => {
    setIsSubmenuOpen(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  // Define navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      {
        name: t('nav.dashboard'),
        path: '/dashboard',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
        ),
      },
      {
        name: t('nav.profile'),
        path: '/profile',
        icon: (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
          </svg>
        ),
      },
    ];

    if (isSuperAdmin()) {
      return [
        ...commonItems,
        {
          name: t('nav.clients'),
          path: '/admin/clients',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allClients'), path: '/admin/clients' },
            { name: t('nav.addClient'), path: '/admin/clients/add' },
          ],
        },
        {
          name: t('nav.users'),
          path: '/admin/users',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allUsers'), path: '/admin/users' },
            { name: t('nav.addUser'), path: '/admin/users/add' },
          ],
        },
        {
          name: t('nav.settings'),
          path: '/admin/settings',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.generalSettings'), path: '/admin/settings/general' },
            { name: t('nav.paymentSettings'), path: '/admin/settings/payment' },
            { name: t('nav.emailSettings'), path: '/admin/settings/email' },
            { name: t('nav.smsSettings'), path: '/admin/settings/sms' },
          ],
        },
        {
          name: t('nav.reports'),
          path: '/admin/reports',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.clientReports'), path: '/admin/reports/clients' },
            { name: t('nav.revenueReports'), path: '/admin/reports/revenue' },
            { name: t('nav.usageReports'), path: '/admin/reports/usage' },
          ],
        },
      ];
    } else if (isClient()) {
      return [
        ...commonItems,
        {
          name: t('nav.properties'),
          path: '/client/properties',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allProperties'), path: '/client/properties' },
            { name: t('nav.addProperty'), path: '/client/properties/add' },
          ],
        },
        {
          name: t('nav.customers'),
          path: '/client/customers',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allCustomers'), path: '/client/customers' },
            { name: t('nav.addCustomer'), path: '/client/customers/add' },
          ],
        },
        {
          name: t('nav.meters'),
          path: '/client/meters',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allMeters'), path: '/client/meters' },
            { name: t('nav.addMeter'), path: '/client/meters/add' },
            { name: t('nav.meterReadings'), path: '/client/meters/readings' },
          ],
        },
        {
          name: t('nav.tariffs'),
          path: '/client/tariffs',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allTariffs'), path: '/client/tariffs' },
            { name: t('nav.addTariff'), path: '/client/tariffs/add' },
          ],
        },
        {
          name: t('nav.payments'),
          path: '/client/payments',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allPayments'), path: '/client/payments' },
            { name: t('nav.pendingPayments'), path: '/client/payments/pending' },
            { name: t('nav.paymentMethods'), path: '/client/payments/methods' },
          ],
        },
        {
          name: t('nav.invoices'),
          path: '/client/invoices',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.allInvoices'), path: '/client/invoices' },
            { name: t('nav.createInvoice'), path: '/client/invoices/create' },
          ],
        },
        {
          name: t('nav.reports'),
          path: '/client/reports',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          ),
          submenu: [
            { name: t('nav.customerReports'), path: '/client/reports/customers' },
            { name: t('nav.usageReports'), path: '/client/reports/usage' },
            { name: t('nav.revenueReports'), path: '/client/reports/revenue' },
          ],
        },
        {
          name: t('nav.settings'),
          path: '/client/settings',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            </svg>
          ),
        },
      ];
    } else if (isCustomer()) {
      return [
        ...commonItems,
        {
          name: t('nav.meters'),
          path: '/customer/meters',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          ),
        },
        {
          name: t('nav.topup'),
          path: '/customer/topup',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          ),
        },
        {
          name: t('nav.payments'),
          path: '/customer/payments',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          ),
        },
        {
          name: t('nav.usage'),
          path: '/customer/usage',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          ),
        },
        {
          name: t('nav.invoices'),
          path: '/customer/invoices',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          ),
        },
        {
          name: t('nav.support'),
          path: '/customer/support',
          icon: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          ),
        },
      ];
    }

    // Default navigation items if no role matches
    return commonItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <>
      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      {/* Sidebar for desktop */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-grow bg-indigo-700 dark:bg-gray-800 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <Link to="/dashboard" className="flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/logo.png"
                  alt="IndoWater"
                />
                <span className="ml-2 text-xl font-bold text-white">IndoWater</span>
              </Link>
            </div>
            <div className="mt-5 flex-1 flex flex-col">
              <nav className="flex-1 px-2 space-y-1">
                {navigationItems.map((item) => (
                  <div key={item.name}>
                    {item.submenu ? (
                      <>
                        <button
                          onClick={() => toggleSubmenu(item.name)}
                          className={`${
                            isActive(item.path)
                              ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                              : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                          } group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                        >
                          {item.icon}
                          <span className="flex-1 ml-3">{item.name}</span>
                          <svg
                            className={`${
                              isSubmenuOpen[item.name] ? 'transform rotate-180' : ''
                            } w-5 h-5 transition-transform duration-150 ease-in-out`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M19 9l-7 7-7-7"
                            ></path>
                          </svg>
                        </button>
                        {isSubmenuOpen[item.name] && (
                          <div className="pl-4 pr-2 space-y-1">
                            {item.submenu.map((subItem) => (
                              <Link
                                key={subItem.name}
                                to={subItem.path}
                                className={`${
                                  isActive(subItem.path)
                                    ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                                    : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                                } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                              >
                                <span className="ml-3">{subItem.name}</span>
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        to={item.path}
                        className={`${
                          isActive(item.path)
                            ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                            : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                        } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                      >
                        {item.icon}
                        <span className="ml-3">{item.name}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`${
          isMobileMenuOpen ? 'fixed' : 'hidden'
        } lg:hidden z-50 inset-y-0 left-0 w-64 transition duration-300 transform bg-indigo-700 dark:bg-gray-800 overflow-y-auto`}
      >
        <div className="flex items-center justify-between flex-shrink-0 px-4 py-4">
          <Link to="/dashboard" className="flex items-center">
            <img
              className="h-8 w-auto"
              src="/logo.png"
              alt="IndoWater"
            />
            <span className="ml-2 text-xl font-bold text-white">IndoWater</span>
          </Link>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-white focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              ></path>
            </svg>
          </button>
        </div>
        <nav className="mt-5 px-2 space-y-1">
          {navigationItems.map((item) => (
            <div key={item.name}>
              {item.submenu ? (
                <>
                  <button
                    onClick={() => toggleSubmenu(item.name)}
                    className={`${
                      isActive(item.path)
                        ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                        : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                    } group w-full flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  >
                    {item.icon}
                    <span className="flex-1 ml-3">{item.name}</span>
                    <svg
                      className={`${
                        isSubmenuOpen[item.name] ? 'transform rotate-180' : ''
                      } w-5 h-5 transition-transform duration-150 ease-in-out`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      ></path>
                    </svg>
                  </button>
                  {isSubmenuOpen[item.name] && (
                    <div className="pl-4 pr-2 space-y-1">
                      {item.submenu.map((subItem) => (
                        <Link
                          key={subItem.name}
                          to={subItem.path}
                          className={`${
                            isActive(subItem.path)
                              ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                              : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                          } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                          onClick={() => setIsMobileMenuOpen(false)}
                        >
                          <span className="ml-3">{subItem.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  className={`${
                    isActive(item.path)
                      ? 'bg-indigo-800 dark:bg-gray-900 text-white'
                      : 'text-indigo-100 dark:text-gray-300 hover:bg-indigo-600 dark:hover:bg-gray-700'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;