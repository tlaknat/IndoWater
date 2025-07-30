import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/dashboard/StatCard';
import ChartCard from '../../components/dashboard/ChartCard';
import Button from '../../components/common/Button';
import { dashboardAPI, meterAPI } from '../../utils/api';

const CustomerDashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  
  const [meters, setMeters] = useState([]);
  const [loadingMeters, setLoadingMeters] = useState(true);
  const [metersError, setMetersError] = useState(null);
  
  const [consumptionData, setConsumptionData] = useState(null);
  const [loadingConsumptionData, setLoadingConsumptionData] = useState(true);
  const [consumptionError, setConsumptionError] = useState(null);
  
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [transactionsError, setTransactionsError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoadingSummary(true);
        const summaryResponse = await dashboardAPI.getSummary();
        setSummary(summaryResponse.data.data);
        setSummaryError(null);
      } catch (err) {
        console.error('Error fetching summary:', err);
        setSummaryError(t('dashboard.errorFetchingSummary'));
      } finally {
        setLoadingSummary(false);
      }

      try {
        setLoadingMeters(true);
        const metersResponse = await meterAPI.getMeters();
        setMeters(metersResponse.data.data);
        setMetersError(null);
      } catch (err) {
        console.error('Error fetching meters:', err);
        setMetersError(t('dashboard.errorFetchingMeters'));
      } finally {
        setLoadingMeters(false);
      }

      try {
        setLoadingConsumptionData(true);
        const consumptionResponse = await dashboardAPI.getConsumptionChart({ period: 'monthly', year: new Date().getFullYear() });
        setConsumptionData(consumptionResponse.data.data);
        setConsumptionError(null);
      } catch (err) {
        console.error('Error fetching consumption data:', err);
        setConsumptionError(t('dashboard.errorFetchingConsumptionData'));
      } finally {
        setLoadingConsumptionData(false);
      }

      try {
        setLoadingTransactions(true);
        const transactionsResponse = await dashboardAPI.getRecentTransactions();
        setTransactions(transactionsResponse.data.data.slice(0, 5));
        setTransactionsError(null);
      } catch (err) {
        console.error('Error fetching transactions:', err);
        setTransactionsError(t('dashboard.errorFetchingTransactions'));
      } finally {
        setLoadingTransactions(false);
      }
    };

    fetchDashboardData();
  }, [t]);

  // Prepare chart data
  const prepareConsumptionChartData = () => {
    if (!consumptionData) return null;

    const labels = consumptionData.map(item => item.label);
    const datasets = [
      {
        label: t('dashboard.consumption'),
        data: consumptionData.map(item => item.value),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        fill: true,
        tension: 0.4
      }
    ];

    return { labels, datasets };
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.welcome')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('dashboard.summary')}
        </p>
      </div>

      {/* Meters Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            {t('dashboard.yourMeters')}
          </h2>
        </div>
        
        {loadingMeters ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="animate-pulse bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : metersError ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <p className="text-red-500 dark:text-red-400">{metersError}</p>
          </div>
        ) : meters.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              {t('dashboard.noMeters')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {meters.map((meter) => (
              <div key={meter.id} className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {meter.meter_number}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {meter.property_name} - {meter.unit_number}
                      </p>
                    </div>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      meter.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {meter.status === 'active' ? t('common.active') : t('common.inactive')}
                    </span>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboard.currentBalance')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(meter.current_balance)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboard.lastReading')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {meter.last_reading} m³
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500 dark:text-gray-400">{t('dashboard.lastReadingDate')}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {new Date(meter.last_reading_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-6 flex space-x-3">
                    <Link to={`/customer/topup?meter=${meter.id}`} className="flex-1">
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full"
                        disabled={meter.status !== 'active'}
                      >
                        {t('dashboard.topUp')}
                      </Button>
                    </Link>
                    <Link to={`/customer/meters/${meter.id}`} className="flex-1">
                      <Button
                        variant="light"
                        size="sm"
                        className="w-full"
                      >
                        {t('dashboard.details')}
                      </Button>
                    </Link>
                  </div>
                </div>
                
                {meter.status === 'active' && meter.current_balance < meter.low_balance_threshold && (
                  <div className="px-6 py-3 bg-yellow-50 dark:bg-yellow-900 border-t border-yellow-100 dark:border-yellow-800">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <p className="ml-2 text-sm text-yellow-700 dark:text-yellow-200">
                        {t('dashboard.lowBalanceWarning')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t('dashboard.totalConsumption')}
          value={loadingSummary ? '...' : `${summary?.total_consumption} m³`}
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.consumption_change}
          changeType={loadingSummary ? 'neutral' : summary?.consumption_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.averageDailyUsage')}
          value={loadingSummary ? '...' : `${summary?.avg_daily_usage} m³`}
          icon={
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.avg_usage_change}
          changeType={loadingSummary ? 'neutral' : summary?.avg_usage_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.totalSpent')}
          value={loadingSummary ? '...' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(summary?.total_spent)}
          icon={
            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.spent_change}
          changeType={loadingSummary ? 'neutral' : summary?.spent_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.totalTopups')}
          value={loadingSummary ? '...' : summary?.total_topups}
          icon={
            <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.topups_change}
          changeType={loadingSummary ? 'neutral' : summary?.topups_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
      </div>

      {/* Consumption Chart and Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ChartCard
            title={t('dashboard.waterConsumption')}
            subtitle={t('dashboard.monthlyConsumption')}
            type="bar"
            data={prepareConsumptionChartData()}
            loading={loadingConsumptionData}
            error={consumptionError}
          />
        </div>
        
        <div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t('dashboard.recentTransactions')}
              </h3>
              <Link
                to="/customer/transactions"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('common.viewAll')}
              </Link>
            </div>
            
            {loadingTransactions ? (
              <div className="animate-pulse space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
                    <div className="ml-3 flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactionsError ? (
              <p className="text-red-500 dark:text-red-400">{transactionsError}</p>
            ) : transactions.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('dashboard.noTransactions')}
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center">
                    <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${
                      transaction.type === 'topup'
                        ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'topup' ? (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(transaction.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${
                      transaction.type === 'topup'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {transaction.type === 'topup' ? '+' : '-'}
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(transaction.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboard;