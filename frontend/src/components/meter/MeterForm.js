import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { propertyAPI, customerAPI, tariffAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const MeterForm = ({ initialValues = {}, onSubmit, isEdit = false, clientId = null }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [tariffs, setTariffs] = useState([]);
  const [loadingTariffs, setLoadingTariffs] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(initialValues.property_id || '');

  useEffect(() => {
    const fetchProperties = async () => {
      if (!clientId) return;
      
      setLoadingProperties(true);
      try {
        const response = await propertyAPI.getProperties({ client_id: clientId });
        setProperties(response.data.data);
      } catch (err) {
        console.error('Error fetching properties:', err);
      } finally {
        setLoadingProperties(false);
      }
    };

    const fetchTariffs = async () => {
      if (!clientId) return;
      
      setLoadingTariffs(true);
      try {
        const response = await tariffAPI.getTariffs({ client_id: clientId });
        setTariffs(response.data.data);
      } catch (err) {
        console.error('Error fetching tariffs:', err);
      } finally {
        setLoadingTariffs(false);
      }
    };

    fetchProperties();
    fetchTariffs();
  }, [clientId]);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!selectedProperty) return;
      
      setLoadingCustomers(true);
      try {
        const response = await propertyAPI.getPropertyCustomers(selectedProperty);
        setCustomers(response.data.data);
      } catch (err) {
        console.error('Error fetching customers:', err);
      } finally {
        setLoadingCustomers(false);
      }
    };

    if (selectedProperty) {
      fetchCustomers();
    } else {
      setCustomers([]);
    }
  }, [selectedProperty]);

  const defaultValues = {
    meter_number: '',
    serial_number: '',
    property_id: '',
    customer_id: '',
    tariff_id: '',
    initial_reading: 0,
    initial_balance: 0,
    installation_date: new Date().toISOString().split('T')[0],
    status: 'active',
    ...initialValues
  };

  const validationSchema = Yup.object({
    meter_number: Yup.string()
      .required(t('common.required')),
    serial_number: Yup.string()
      .required(t('common.required')),
    property_id: Yup.string()
      .required(t('common.required')),
    customer_id: Yup.string()
      .required(t('common.required')),
    tariff_id: Yup.string()
      .required(t('common.required')),
    initial_reading: Yup.number()
      .min(0, t('meter.invalidReading'))
      .required(t('common.required')),
    initial_balance: Yup.number()
      .min(0, t('meter.invalidBalance'))
      .required(t('common.required')),
    installation_date: Yup.date()
      .required(t('common.required')),
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
        setSuccess(isEdit ? t('meter.updateSuccess') : t('meter.createSuccess'));
        
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

  // Update selected property when form value changes
  useEffect(() => {
    if (formik.values.property_id !== selectedProperty) {
      setSelectedProperty(formik.values.property_id);
      
      // Clear customer selection when property changes
      if (formik.values.property_id !== initialValues.property_id) {
        formik.setFieldValue('customer_id', '');
      }
    }
  }, [formik.values.property_id, selectedProperty, initialValues.property_id]);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        {isEdit ? t('meter.editMeter') : t('meter.addMeter')}
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
            id="meter_number"
            name="meter_number"
            label={t('meter.meterNumber')}
            value={formik.values.meter_number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.meter_number && formik.errors.meter_number}
            touched={formik.touched.meter_number}
            required
          />
          
          <Input
            id="serial_number"
            name="serial_number"
            label={t('meter.serialNumber')}
            value={formik.values.serial_number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.serial_number && formik.errors.serial_number}
            touched={formik.touched.serial_number}
            required
          />
          
          <div className="mb-4">
            <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('meter.property')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="property_id"
              name="property_id"
              value={formik.values.property_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.property_id && formik.errors.property_id
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
                ${loadingProperties ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}
              `}
              disabled={loadingProperties || isEdit}
              required
            >
              <option value="">{loadingProperties ? t('common.loading') : t('meter.selectProperty')}</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
            {formik.touched.property_id && formik.errors.property_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.property_id}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="customer_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('meter.customer')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={formik.values.customer_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.customer_id && formik.errors.customer_id
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
                ${loadingCustomers || !selectedProperty ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}
              `}
              disabled={loadingCustomers || !selectedProperty || isEdit}
              required
            >
              <option value="">
                {loadingCustomers 
                  ? t('common.loading') 
                  : !selectedProperty 
                    ? t('meter.selectPropertyFirst') 
                    : t('meter.selectCustomer')
                }
              </option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name} - {customer.unit_number}
                </option>
              ))}
            </select>
            {formik.touched.customer_id && formik.errors.customer_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.customer_id}
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="tariff_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('meter.tariff')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="tariff_id"
              name="tariff_id"
              value={formik.values.tariff_id}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.tariff_id && formik.errors.tariff_id
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
                ${loadingTariffs ? 'bg-gray-100 cursor-not-allowed dark:bg-gray-800' : ''}
              `}
              disabled={loadingTariffs}
              required
            >
              <option value="">{loadingTariffs ? t('common.loading') : t('meter.selectTariff')}</option>
              {tariffs.map((tariff) => (
                <option key={tariff.id} value={tariff.id}>
                  {tariff.name} - {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(tariff.rate_per_unit)}
                </option>
              ))}
            </select>
            {formik.touched.tariff_id && formik.errors.tariff_id && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.tariff_id}
              </p>
            )}
          </div>
          
          <Input
            id="initial_reading"
            name="initial_reading"
            type="number"
            label={t('meter.initialReading')}
            value={formik.values.initial_reading}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.initial_reading && formik.errors.initial_reading}
            touched={formik.touched.initial_reading}
            required
            disabled={isEdit}
          />
          
          <Input
            id="initial_balance"
            name="initial_balance"
            type="number"
            label={t('meter.initialBalance')}
            value={formik.values.initial_balance}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.initial_balance && formik.errors.initial_balance}
            touched={formik.touched.initial_balance}
            required
            disabled={isEdit}
          />
          
          <Input
            id="installation_date"
            name="installation_date"
            type="date"
            label={t('meter.installationDate')}
            value={formik.values.installation_date}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.installation_date && formik.errors.installation_date}
            touched={formik.touched.installation_date}
            required
            disabled={isEdit}
          />
          
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

export default MeterForm;