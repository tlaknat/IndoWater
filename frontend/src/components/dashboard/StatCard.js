import React from 'react';

const StatCard = ({ title, value, icon, change, changeType = 'increase', footer }) => {
  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`
              p-3 rounded-md 
              ${changeType === 'increase' ? 'bg-green-100 dark:bg-green-900' : ''}
              ${changeType === 'decrease' ? 'bg-red-100 dark:bg-red-900' : ''}
              ${changeType === 'neutral' ? 'bg-blue-100 dark:bg-blue-900' : ''}
            `}>
              {icon}
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900 dark:text-white">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      {(change || footer) && (
        <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
          <div className="text-sm">
            {change && (
              <span className={`
                font-medium mr-2
                ${changeType === 'increase' ? 'text-green-600 dark:text-green-400' : ''}
                ${changeType === 'decrease' ? 'text-red-600 dark:text-red-400' : ''}
                ${changeType === 'neutral' ? 'text-blue-600 dark:text-blue-400' : ''}
              `}>
                {changeType === 'increase' && '↑'}
                {changeType === 'decrease' && '↓'}
                {change}
              </span>
            )}
            {footer && (
              <span className="text-gray-500 dark:text-gray-400">
                {footer}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatCard;