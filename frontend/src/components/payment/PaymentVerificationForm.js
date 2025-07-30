import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { paymentAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const PaymentVerificationForm = ({ paymentId, onVerify, onReject }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [loadingPayment, setLoadingPayment] = useState(false);

  useEffect(() => {
    const fetchPaymentInfo = async () => {
      if (!paymentId) return;
      
      setLoadingPayment(true);
      try {
        const response = await paymentAPI.getPayment(paymentId);
        setPaymentInfo(response.data.data);
      } catch (err) {
        console.error('Error fetching payment info:', err);
        setError(t('payment.errorFetchingPayment'));
      } finally {
        setLoadingPayment(false);
      }
    };

    fetchPaymentInfo();
  }, [paymentId, t]);

  const validationSchema = Yup.object({
    verification_notes: Yup.string(),
    rejection_reason: Yup.string()
      .when('action', {
        is: 'reject',
        then: Yup.string().required(t('payment.rejectionReasonRequired'))
      })
  });

  const formik = useFormik({
    initialValues: {
      verification_notes: '',
      rejection_reason: '',
      action: 'verify'
    },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError(null);
      setSuccess(null);
      
      try {
        if (values.action === 'verify') {
          await onVerify(paymentId, values.verification_notes);
          setSuccess(t('payment.verificationSuccess'));
        } else {
          await onReject(paymentId, values.rejection_reason);
          setSuccess(t('payment.rejectionSuccess'));
        }
        
        // Refresh payment info
        const response = await paymentAPI.getPayment(paymentId);
        setPaymentInfo(response.data.data);
      } catch (err) {
        setError(err.message || t('common.errorOccurred'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  if (loadingPayment) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <Alert
          type="error"
          message={error || t('payment.paymentNotFound')}
          className="mb-4"
        />
      </div>
    );
  }

  // If payment is already verified or rejected, show the status
  if (paymentInfo.status !== 'pending') {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
          {t('payment.paymentDetails')}
        </h2>
        
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentId')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.payment_id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.amount')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(paymentInfo.amount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentMethod')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.payment_method}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentDate')}</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(paymentInfo.payment_date).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.status')}</p>
              <p className={`text-sm font-medium ${
                paymentInfo.status === 'verified' 
                  ? 'text-green-600 dark:text-green-400' 
                  : paymentInfo.status === 'rejected'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-yellow-600 dark:text-yellow-400'
              }`}>
                {paymentInfo.status === 'verified' 
                  ? t('payment.verified') 
                  : paymentInfo.status === 'rejected'
                    ? t('payment.rejected')
                    : t('payment.pending')
                }
              </p>
            </div>
            {paymentInfo.verification_date && (
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {paymentInfo.status === 'verified' 
                    ? t('payment.verificationDate') 
                    : t('payment.rejectionDate')
                  }
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(paymentInfo.verification_date).toLocaleString()}
                </p>
              </div>
            )}
            {paymentInfo.verification_notes && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.verificationNotes')}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.verification_notes}</p>
              </div>
            )}
            {paymentInfo.rejection_reason && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.rejectionReason')}</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.rejection_reason}</p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            type="button"
            variant="light"
            onClick={() => window.history.back()}
          >
            {t('common.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        {t('payment.verifyPayment')}
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
      
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-2">
          {t('payment.paymentDetails')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentId')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.payment_id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.amount')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(paymentInfo.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentMethod')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.payment_method}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentDate')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {new Date(paymentInfo.payment_date).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.customer')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('payment.paymentFor')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{paymentInfo.payment_for}</p>
          </div>
        </div>
        
        {paymentInfo.proof_url && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('payment.paymentProof')}</p>
            <a 
              href={paymentInfo.proof_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
            >
              <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              {t('payment.viewProof')}
            </a>
          </div>
        )}
      </div>
      
      <form onSubmit={formik.handleSubmit}>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('payment.action')}
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="mt-1">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <input
                  id="action-verify"
                  name="action"
                  type="radio"
                  value="verify"
                  checked={formik.values.action === 'verify'}
                  onChange={formik.handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="action-verify" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('payment.verify')}
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="action-reject"
                  name="action"
                  type="radio"
                  value="reject"
                  checked={formik.values.action === 'reject'}
                  onChange={formik.handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <label htmlFor="action-reject" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('payment.reject')}
                </label>
              </div>
            </div>
          </div>
        </div>
        
        {formik.values.action === 'verify' ? (
          <div className="mb-6">
            <label htmlFor="verification_notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.verificationNotes')}
            </label>
            <textarea
              id="verification_notes"
              name="verification_notes"
              rows="3"
              value={formik.values.verification_notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              placeholder={t('payment.verificationNotesPlaceholder')}
            ></textarea>
          </div>
        ) : (
          <div className="mb-6">
            <label htmlFor="rejection_reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.rejectionReason')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <textarea
              id="rejection_reason"
              name="rejection_reason"
              rows="3"
              value={formik.values.rejection_reason}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.rejection_reason && formik.errors.rejection_reason
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
              `}
              placeholder={t('payment.rejectionReasonPlaceholder')}
              required={formik.values.action === 'reject'}
            ></textarea>
            {formik.touched.rejection_reason && formik.errors.rejection_reason && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.rejection_reason}
              </p>
            )}
          </div>
        )}
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            type="button"
            variant="light"
            onClick={() => window.history.back()}
            disabled={formik.isSubmitting}
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant={formik.values.action === 'verify' ? 'success' : 'danger'}
            loading={formik.isSubmitting}
            disabled={formik.isSubmitting}
          >
            {formik.values.action === 'verify' ? t('payment.verify') : t('payment.reject')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentVerificationForm;