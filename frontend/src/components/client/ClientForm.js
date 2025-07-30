import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const ClientForm = ({ initialValues = {}, onSubmit, isEdit = false }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const defaultValues = {
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Indonesia',
    contact_person: '',
    contact_email: '',
    contact_phone: '',
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
      .matches(/^[0-9+\-\s()]*$/, t('common.invalidPhone')),
    address: Yup.string()
      .required(t('common.required')),
    city: Yup.string()
      .required(t('common.required')),
    state: Yup.string()
      .required(t('common.required')),
    postal_code: Yup.string()
      .required(t('common.required')),
    country: Yup.string()
      .required(t('common.required')),
    contact_person: Yup.string()
      .required(t('common.required')),
    contact_email: Yup.string()
      .email(t('common.invalidEmail'))
      .required(t('common.required')),
    contact_phone: Yup.string()
      .matches(/^[0-9+\-\s()]*$/, t('common.invalidPhone'))
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
        setSuccess(isEdit ? t('client.updateSuccess') : t('client.createSuccess'));
        
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
        {isEdit ? t('client.editClient') : t('client.addClient')}
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
          
          <Input
            id="city"
            name="city"
            label={t('common.city')}
            value={formik.values.city}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.city && formik.errors.city}
            touched={formik.touched.city}
            required
          />
          
          <Input
            id="state"
            name="state"
            label={t('common.state')}
            value={formik.values.state}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.state && formik.errors.state}
            touched={formik.touched.state}
            required
          />
          
          <Input
            id="postal_code"
            name="postal_code"
            label={t('common.postalCode')}
            value={formik.values.postal_code}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.postal_code && formik.errors.postal_code}
            touched={formik.touched.postal_code}
            required
          />
          
          <Input
            id="country"
            name="country"
            label={t('common.country')}
            value={formik.values.country}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.country && formik.errors.country}
            touched={formik.touched.country}
            required
          />
          
          <Input
            id="contact_person"
            name="contact_person"
            label={t('client.contactPerson')}
            value={formik.values.contact_person}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.contact_person && formik.errors.contact_person}
            touched={formik.touched.contact_person}
            required
          />
          
          <Input
            id="contact_email"
            name="contact_email"
            type="email"
            label={t('client.contactEmail')}
            value={formik.values.contact_email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.contact_email && formik.errors.contact_email}
            touched={formik.touched.contact_email}
            required
          />
          
          <Input
            id="contact_phone"
            name="contact_phone"
            label={t('client.contactPhone')}
            value={formik.values.contact_phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.contact_phone && formik.errors.contact_phone}
            touched={formik.touched.contact_phone}
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

export default ClientForm;