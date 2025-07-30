import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { topupAPI, paymentAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const TopupForm = ({ meterId = null, customerId = null }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [meterInfo, setMeterInfo] = useState(null);
  const [loadingMeter, setLoadingMeter] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [topupAmounts, setTopupAmounts] = useState([]);
  const [loadingTopupAmounts, setLoadingTopupAmounts] = useState(false);
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [calculatingFee, setCalculatingFee] = useState(false);

  useEffect(() => {
    const fetchMeterInfo = async () => {
      if (!meterId) return;
      
      setLoadingMeter(true);
      try {
        const response = await topupAPI.validateMeter(meterId);
        setMeterInfo(response.data.data);
      } catch (err) {
        console.error('Error fetching meter info:', err);
        setError(t('topup.invalidMeter'));
      } finally {
        setLoadingMeter(false);
      }
    };

    const fetchPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      try {
        const response = await paymentAPI.getPaymentMethods();
        setPaymentMethods(response.data.data);
      } catch (err) {
        console.error('Error fetching payment methods:', err);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    const fetchTopupAmounts = async () => {
      setLoadingTopupAmounts(true);
      try {
        const response = await topupAPI.getTopupAmounts();
        setTopupAmounts(response.data.data);
      } catch (err) {
        console.error('Error fetching topup amounts:', err);
      } finally {
        setLoadingTopupAmounts(false);
      }
    };

    fetchMeterInfo();
    fetchPaymentMethods();
    fetchTopupAmounts();
  }, [meterId, t]);

  const calculateFee = async (amount, paymentMethod) => {
    if (!amount || !paymentMethod) return;
    
    setCalculatingFee(true);
    try {
      const response = await topupAPI.calculateFee(amount, paymentMethod);
      setCalculatedFee(response.data.data);
    } catch (err) {
      console.error('Error calculating fee:', err);
    } finally {
      setCalculatingFee(false);
    }
  };

  const validationSchema = Yup.object({
    meter_id: Yup.string()
      .required(t('common.required')),
    amount: Yup.number()
      .required(t('common.required'))
      .positive(t('topup.invalidAmount')),
    payment_method: Yup.string()
      .required(t('common.required')),
    customer_name: Yup.string()
      .required(t('common.required')),
    customer_phone: Yup.string()
      .matches(/^[0-9+\-\s()]*$/, t('common.invalidPhone'))
      .required(t('common.required')),
    customer_email: Yup.string()
      .email(t('common.invalidEmail'))
      .required(t('common.required'))
  });

  const formik = useFormik({
    initialValues: {
      meter_id: meterId || '',
      amount: '',
      payment_method: '',
      customer_name: meterInfo?.customer_name || '',
      customer_phone: meterInfo?.customer_phone || '',
      customer_email: meterInfo?.customer_email || ''
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setError(null);
      setSuccess(null);
      
      try {
        const response = await topupAPI.createTopup(values);
        setSuccess(t('topup.success'));
        
        // Redirect to payment gateway if needed
        if (response.data.data.redirect_url) {
          window.location.href = response.data.data.redirect_url;
        } else {
          resetForm();
        }
      } catch (err) {
        setError(err.message || t('common.errorOccurred'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  // Update fee calculation when amount or payment method changes
  useEffect(() => {
    if (formik.values.amount && formik.values.payment_method) {
      calculateFee(formik.values.amount, formik.values.payment_method);
    } else {
      setCalculatedFee(null);
    }
  }, [formik.values.amount, formik.values.payment_method]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        {t('topup.title')}
      </h2>
      
      {error && (
        <Alert
          type="error"
          message={error}
          className="mb-4"
          onClose={() => setError(null)}
        />
      )}
      
      {success && (
        <Alert
          type="success"
          message={success}
          className="mb-4"
          onClose={() => setSuccess(null)}
        />
      )}
      
      {loadingMeter ? (
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      ) : (
        <form onSubmit={formik.handleSubmit}>
          {!meterId && (
            <div className="mb-6">
              <Input
                id="meter_id"
                name="meter_id"
                label={t('topup.meterId')}
                value={formik.values.meter_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.meter_id && formik.errors.meter_id}
                touched={formik.touched.meter_id}
                required
              />
            </div>
          )}
          
          {meterInfo && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                {t('topup.meterInfo')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.customer')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.meterNumber')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.meter_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.property')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.property_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.unitNumber')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.unit_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.currentBalance')}</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(meterInfo.current_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.status')}</p>
                  <p className={`text-sm font-medium ${
                    meterInfo.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {meterInfo.status === 'active' ? t('common.active') : t('common.inactive')}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('topup.amount')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {loadingTopupAmounts ? (
                  <div className="col-span-2 animate-pulse h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                ) : (
                  topupAmounts.map((amount) => (
                    <button
                      key={amount.value}
                      type="button"
                      className={`
                        py-2 px-4 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500
                        ${
                          formik.values.amount === amount.value
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }
                      `}
                      onClick={() => formik.setFieldValue('amount', amount.value)}
                    >
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount.value)}
                    </button>
                  ))
                )}
              </div>
              <div className="mt-2">
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  placeholder={t('topup.customAmount')}
                  value={formik.values.amount}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.amount && formik.errors.amount}
                  touched={formik.touched.amount}
                />
              </div>
            </div>
            
            <div className="mb-4">
              <label htmlFor="payment_method" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('topup.paymentMethod')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <select
                id="payment_method"
                name="payment_method"
                value={formik.values.payment_method}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                className={`
                  block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                  focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                  ${
                    formik.touched.payment_method && formik.errors.payment_method
                      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                      : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                  }
                  ${loadingPaymentMethods ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}
                `}
                disabled={loadingPaymentMethods}
                required
              >
                <option value="">{loadingPaymentMethods ? t('common.loading') : t('topup.selectPaymentMethod')}</option>
                {paymentMethods.map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
              {formik.touched.payment_method && formik.errors.payment_method && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {formik.errors.payment_method}
                </p>
              )}
            </div>
            
            <Input
              id="customer_name"
              name="customer_name"
              label={t('topup.customerName')}
              value={formik.values.customer_name}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.customer_name && formik.errors.customer_name}
              touched={formik.touched.customer_name}
              required
            />
            
            <Input
              id="customer_phone"
              name="customer_phone"
              label={t('topup.customerPhone')}
              value={formik.values.customer_phone}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.customer_phone && formik.errors.customer_phone}
              touched={formik.touched.customer_phone}
              required
            />
            
            <Input
              id="customer_email"
              name="customer_email"
              type="email"
              label={t('topup.customerEmail')}
              value={formik.values.customer_email}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              error={formik.touched.customer_email && formik.errors.customer_email}
              touched={formik.touched.customer_email}
              required
            />
          </div>
          
          {calculatedFee && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
                {t('topup.paymentSummary')}
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('topup.topupAmount')}</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculatedFee.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('topup.serviceFee')}</span>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculatedFee.fee)}
                  </span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-sm text-gray-900 dark:text-white">{t('topup.totalAmount')}</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(calculatedFee.total)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="mt-6 flex justify-end space-x-3">
            <Button
              type="button"
              variant="light"
              onClick={() => formik.resetForm()}
              disabled={formik.isSubmitting}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={formik.isSubmitting}
              disabled={formik.isSubmitting || !meterInfo || (meterInfo && meterInfo.status !== 'active')}
            >
              {t('topup.proceed')}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default TopupForm;