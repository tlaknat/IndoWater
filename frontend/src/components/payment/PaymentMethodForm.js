import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const PaymentMethodForm = ({ initialValues = {}, onSubmit, isEdit = false }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const defaultValues = {
    name: '',
    code: '',
    description: '',
    fee_type: 'percentage',
    fee_amount: 0,
    min_fee: 0,
    max_fee: 0,
    instructions: '',
    status: 'active',
    ...initialValues
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required(t('common.required')),
    code: Yup.string()
      .required(t('common.required')),
    description: Yup.string(),
    fee_type: Yup.string()
      .oneOf(['percentage', 'fixed'], t('payment.invalidFeeType'))
      .required(t('common.required')),
    fee_amount: Yup.number()
      .min(0, t('payment.invalidFeeAmount'))
      .required(t('common.required')),
    min_fee: Yup.number()
      .min(0, t('payment.invalidMinFee')),
    max_fee: Yup.number()
      .min(0, t('payment.invalidMaxFee'))
      .test(
        'max-greater-than-min',
        t('payment.maxFeeMustBeGreater'),
        function(value) {
          const { min_fee } = this.parent;
          return !value || !min_fee || value >= min_fee;
        }
      ),
    instructions: Yup.string(),
    status: Yup.string()
      .oneOf(['active', 'inactive'], t('common.invalidStatus'))
      .required(t('common.required'))
  });

  const formik = useFormik({
    initialValues: defaultValues,
    validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setError(null);
      setSuccess(null);
      
      try {
        await onSubmit(values);
        setSuccess(isEdit ? t('payment.methodUpdateSuccess') : t('payment.methodCreateSuccess'));
        
        if (!isEdit) {
          resetForm();
        }
      } catch (err) {
        setError(err.message || t('common.errorOccurred'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        {isEdit ? t('payment.editMethod') : t('payment.addMethod')}
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
      
      <form onSubmit={formik.handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            id="name"
            name="name"
            label={t('common.name')}
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.name && formik.errors.name}
            touched={formik.touched.name}
            required
          />
          
          <Input
            id="code"
            name="code"
            label={t('payment.code')}
            value={formik.values.code}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.code && formik.errors.code}
            touched={formik.touched.code}
            required
          />
          
          <div className="md:col-span-2">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.description')}
            </label>
            <textarea
              id="description"
              name="description"
              rows="2"
              value={formik.values.description}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label htmlFor="fee_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.feeType')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="fee_type"
              name="fee_type"
              value={formik.values.fee_type}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.fee_type && formik.errors.fee_type
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
              `}
              required
            >
              <option value="percentage">{t('payment.percentage')}</option>
              <option value="fixed">{t('payment.fixed')}</option>
            </select>
            {formik.touched.fee_type && formik.errors.fee_type && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.fee_type}
              </p>
            )}
          </div>
          
          <Input
            id="fee_amount"
            name="fee_amount"
            type="number"
            label={
              formik.values.fee_type === 'percentage' 
                ? t('payment.feePercentage') 
                : t('payment.feeAmount')
            }
            value={formik.values.fee_amount}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.fee_amount && formik.errors.fee_amount}
            touched={formik.touched.fee_amount}
            required
          />
          
          <Input
            id="min_fee"
            name="min_fee"
            type="number"
            label={t('payment.minFee')}
            value={formik.values.min_fee}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.min_fee && formik.errors.min_fee}
            touched={formik.touched.min_fee}
          />
          
          <Input
            id="max_fee"
            name="max_fee"
            type="number"
            label={t('payment.maxFee')}
            value={formik.values.max_fee}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.max_fee && formik.errors.max_fee}
            touched={formik.touched.max_fee}
          />
          
          <div className="md:col-span-2">
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('payment.instructions')}
            </label>
            <textarea
              id="instructions"
              name="instructions"
              rows="3"
              value={formik.values.instructions}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            ></textarea>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.status')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <div className="mt-1">
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <input
                    id="status-active"
                    name="status"
                    type="radio"
                    value="active"
                    checked={formik.values.status === 'active'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="status-active" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('common.active')}
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="status-inactive"
                    name="status"
                    type="radio"
                    value="inactive"
                    checked={formik.values.status === 'inactive'}
                    onChange={formik.handleChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <label htmlFor="status-inactive" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    {t('common.inactive')}
                  </label>
                </div>
              </div>
              {formik.touched.status && formik.errors.status && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  {formik.errors.status}
                </p>
              )}
            </div>
          </div>
        </div>
        
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
            disabled={formik.isSubmitting}
          >
            {isEdit ? t('common.update') : t('common.create')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default PaymentMethodForm;