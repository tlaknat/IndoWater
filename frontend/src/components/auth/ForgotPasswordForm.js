import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../utils/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const ForgotPasswordForm = () => {
  const { t } = useTranslation();
  const { forgotPassword } = useAuth();
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);

  const formik = useFormik({
    initialValues: {
      email: ''
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t('common.invalidCredentials'))
        .required(t('common.required'))
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setResetError(null);
      setResetSuccess(null);
      
      try {
        const result = await forgotPassword(values.email);
        
        if (result.success) {
          setResetSuccess(t('auth.forgotPassword.resetSuccess'));
          resetForm();
        } else {
          setResetError(result.error);
        }
      } catch (error) {
        setResetError(t('auth.forgotPassword.resetError'));
        console.error('Forgot password error:', error);
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.forgotPassword.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.forgotPassword.subtitle')}
          </p>
        </div>
        
        {resetError && (
          <Alert
            type="error"
            message={resetError}
            className="mb-4"
            onClose={() => setResetError(null)}
          />
        )}
        
        {resetSuccess && (
          <Alert
            type="success"
            message={resetSuccess}
            className="mb-4"
            onClose={() => setResetSuccess(null)}
          />
        )}
        
        <form onSubmit={formik.handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label={t('common.email')}
            placeholder={t('auth.forgotPassword.emailPlaceholder')}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && formik.errors.email}
            touched={formik.touched.email}
            required
          />
          
          <div className="mb-6 mt-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={formik.isSubmitting}
              loading={formik.isSubmitting}
            >
              {t('auth.forgotPassword.resetButton')}
            </Button>
          </div>
        </form>
        
        <div className="text-center">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;