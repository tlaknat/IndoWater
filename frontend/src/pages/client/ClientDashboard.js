import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Layout from '../../components/layout/Layout';
import StatCard from '../../components/dashboard/StatCard';
import ChartCard from '../../components/dashboard/ChartCard';
import ActivityFeed from '../../components/dashboard/ActivityFeed';
import { dashboardAPI } from '../../utils/api';

const ClientDashboard = () => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [summaryError, setSummaryError] = useState(null);
  
  const [revenueData, setRevenueData] = useState(null);
  const [loadingRevenueData, setLoadingRevenueData] = useState(true);
  const [revenueError, setRevenueError] = useState(null);
  
  const [consumptionData, setConsumptionData] = useState(null);
  const [loadingConsumptionData, setLoadingConsumptionData] = useState(true);
  const [consumptionError, setConsumptionError] = useState(null);
  
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState(null);

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
        setLoadingRevenueData(true);
        const revenueResponse = await dashboardAPI.getRevenueChart({ period: 'monthly', year: new Date().getFullYear() });
        setRevenueData(revenueResponse.data.data);
        setRevenueError(null);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        setRevenueError(t('dashboard.errorFetchingRevenueData'));
      } finally {
        setLoadingRevenueData(false);
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
        setLoadingActivities(true);
        const recentTransactionsResponse = await dashboardAPI.getRecentTransactions();
        const recentPaymentsResponse = await dashboardAPI.getRecentPayments();
        
        // Combine and sort by timestamp
        const combinedActivities = [
          ...recentTransactionsResponse.data.data.map(item => ({
            ...item,
            type: 'transaction'
          })),
          ...recentPaymentsResponse.data.data.map(item => ({
            ...item,
            type: 'payment'
          }))
        ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10);
        
        setActivities(combinedActivities);
        setActivitiesError(null);
      } catch (err) {
        console.error('Error fetching activities:', err);
        setActivitiesError(t('dashboard.errorFetchingActivities'));
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchDashboardData();
  }, [t]);

  // Prepare chart data
  const prepareRevenueChartData = () => {
    if (!revenueData) return null;

    const labels = revenueData.map(item => item.label);
    const datasets = [
      {
        label: t('dashboard.revenue'),
        data: revenueData.map(item => item.value),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        fill: true,
        tension: 0.4
      }
    ];

    return { labels, datasets };
  };

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title={t('dashboard.totalProperties')}
          value={loadingSummary ? '...' : summary?.total_properties}
          icon={
            <svg className="h-6 w-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.property_change}
          changeType={loadingSummary ? 'neutral' : summary?.property_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.totalCustomers')}
          value={loadingSummary ? '...' : summary?.total_customers}
          icon={
            <svg className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.customer_change}
          changeType={loadingSummary ? 'neutral' : summary?.customer_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.totalMeters')}
          value={loadingSummary ? '...' : summary?.total_meters}
          icon={
            <svg className="h-6 w-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.meter_change}
          changeType={loadingSummary ? 'neutral' : summary?.meter_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
        
        <StatCard
          title={t('dashboard.totalRevenue')}
          value={loadingSummary ? '...' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(summary?.total_revenue)}
          icon={
            <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          }
          change={loadingSummary ? null : summary?.revenue_change}
          changeType={loadingSummary ? 'neutral' : summary?.revenue_change_type}
          footer={t('dashboard.fromLastMonth')}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title={t('dashboard.revenueOverTime')}
          subtitle={t('dashboard.monthlyRevenue')}
          type="line"
          data={prepareRevenueChartData()}
          loading={loadingRevenueData}
          error={revenueError}
        />
        
        <ChartCard
          title={t('dashboard.waterConsumption')}
          subtitle={t('dashboard.monthlyConsumption')}
          type="bar"
          data={prepareConsumptionChartData()}
          loading={loadingConsumptionData}
          error={consumptionError}
        />
      </div>

      {/* Activity Feed and Pending Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed
            activities={activities}
            loading={loadingActivities}
            error={activitiesError}
          />
        </div>
        
        <div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-5">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('dashboard.pendingTasks')}
            </h3>
            
            {loadingSummary ? (
              <div className="animate-pulse space-y-4">
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ) : summary?.pending_tasks && summary.pending_tasks.length > 0 ? (
              <div className="space-y-4">
                {summary.pending_tasks.map((task, index) => (
                  <div 
                    key={index} 
                    className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {task.type === 'meter_reading' ? (
                          <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                          </svg>
                        ) : task.type === 'payment_verification' ? (
                          <svg className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                          </svg>
                        )}
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{task.description}</p>
                      </div>
                      <div className="ml-2">
                        <button
                          type="button"
                          className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-200 dark:bg-indigo-900 dark:hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          {t('common.view')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                {t('dashboard.noTasks')}
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ClientDashboard;