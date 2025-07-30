import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../utils/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const ResetPasswordForm = () => {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const { token } = useParams();
  const navigate = useNavigate();
  const [resetError, setResetError] = useState(null);
  const [resetSuccess, setResetSuccess] = useState(null);

  const formik = useFormik({
    initialValues: {
      password: '',
      confirmPassword: ''
    },
    validationSchema: Yup.object({
      password: Yup.string()
        .min(8, t('common.passwordTooShort'))
        .required(t('common.required')),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], t('auth.resetPassword.passwordMismatch'))
        .required(t('common.required'))
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setResetError(null);
      setResetSuccess(null);
      
      if (!token) {
        setResetError(t('auth.resetPassword.invalidToken'));
        setSubmitting(false);
        return;
      }
      
      try {
        const result = await resetPassword(token, values.password, values.confirmPassword);
        
        if (result.success) {
          setResetSuccess(t('auth.resetPassword.resetSuccess'));
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setResetError(result.error);
        }
      } catch (error) {
        setResetError(t('auth.resetPassword.resetError'));
        console.error('Reset password error:', error);
      } finally {
        setSubmitting(false);
      }
    }
  });

  if (!token) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.resetPassword.title')}
            </h2>
          </div>
          
          <Alert
            type="error"
            message={t('auth.resetPassword.invalidToken')}
            className="mb-6"
          />
          
          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('auth.resetPassword.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.resetPassword.subtitle')}
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
            id="password"
            name="password"
            type="password"
            label={t('common.password')}
            placeholder={t('auth.resetPassword.passwordPlaceholder')}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && formik.errors.password}
            touched={formik.touched.password}
            required
          />
          
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            label={t('common.confirmPassword')}
            placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && formik.errors.confirmPassword}
            touched={formik.touched.confirmPassword}
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
              {t('auth.resetPassword.resetButton')}
            </Button>
          </div>
        </form>
        
        <div className="text-center">
          <Link
            to="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;