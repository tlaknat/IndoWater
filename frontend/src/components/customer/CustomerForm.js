import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { propertyAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const CustomerForm = ({ initialValues = {}, onSubmit, isEdit = false, clientId = null }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [properties, setProperties] = useState([]);
  const [loadingProperties, setLoadingProperties] = useState(false);

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

    fetchProperties();
  }, [clientId]);

  const defaultValues = {
    name: '',
    email: '',
    phone: '',
    address: '',
    property_id: '',
    unit_number: '',
    id_number: '',
    id_type: 'ktp',
    status: 'active',
    ...initialValues
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required(t('common.required')),
    email: Yup.string()
      .email(t('common.invalidEmail'))
      .required(t('common.required')),
    phone: Yup.string()
      .matches(/^[0-9+\-\s()]*$/, t('common.invalidPhone'))
      .required(t('common.required')),
    address: Yup.string()
      .required(t('common.required')),
    property_id: Yup.string()
      .required(t('common.required')),
    unit_number: Yup.string()
      .required(t('common.required')),
    id_number: Yup.string()
      .required(t('common.required')),
    id_type: Yup.string()
      .oneOf(['ktp', 'passport', 'sim', 'other'], t('common.invalidIdType'))
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
        setSuccess(isEdit ? t('customer.updateSuccess') : t('customer.createSuccess'));
        
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
        {isEdit ? t('customer.editCustomer') : t('customer.addCustomer')}
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
            id="email"
            name="email"
            type="email"
            label={t('common.email')}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && formik.errors.email}
            touched={formik.touched.email}
            required
          />
          
          <Input
            id="phone"
            name="phone"
            label={t('common.phone')}
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.phone && formik.errors.phone}
            touched={formik.touched.phone}
            required
          />
          
          <Input
            id="address"
            name="address"
            label={t('common.address')}
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.address && formik.errors.address}
            touched={formik.touched.address}
            required
          />
          
          <div className="mb-4">
            <label htmlFor="property_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('customer.property')}
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
              disabled={loadingProperties}
              required
            >
              <option value="">{loadingProperties ? t('common.loading') : t('customer.selectProperty')}</option>
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
          
          <Input
            id="unit_number"
            name="unit_number"
            label={t('customer.unitNumber')}
            value={formik.values.unit_number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.unit_number && formik.errors.unit_number}
            touched={formik.touched.unit_number}
            required
          />
          
          <div className="mb-4">
            <label htmlFor="id_type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('customer.idType')}
              <span className="text-red-500 ml-1">*</span>
            </label>
            <select
              id="id_type"
              name="id_type"
              value={formik.values.id_type}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className={`
                block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 
                focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm
                ${
                  formik.touched.id_type && formik.errors.id_type
                    ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white'
                }
              `}
              required
            >
              <option value="ktp">KTP</option>
              <option value="passport">{t('customer.passport')}</option>
              <option value="sim">SIM</option>
              <option value="other">{t('common.other')}</option>
            </select>
            {formik.touched.id_type && formik.errors.id_type && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.id_type}
              </p>
            )}
          </div>
          
          <Input
            id="id_number"
            name="id_number"
            label={t('customer.idNumber')}
            value={formik.values.id_number}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.id_number && formik.errors.id_number}
            touched={formik.touched.id_number}
            required
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

export default CustomerForm;