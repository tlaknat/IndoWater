import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../utils/AuthContext';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const LoginForm = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [loginError, setLoginError] = useState(null);
  const [loginSuccess, setLoginSuccess] = useState(null);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      rememberMe: false
    },
    validationSchema: Yup.object({
      email: Yup.string()
        .email(t('common.invalidCredentials'))
        .required(t('common.required')),
      password: Yup.string()
        .required(t('common.required'))
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setLoginError(null);
      setLoginSuccess(null);
      
      try {
        const result = await login(values.email, values.password);
        
        if (result.success) {
          setLoginSuccess(t('auth.login.loginSuccess'));
          // Redirect will be handled by the AuthContext
        } else {
          setLoginError(result.error);
        }
      } catch (error) {
        setLoginError(t('auth.login.loginError'));
        console.error('Login error:', error);
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
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.subtitle')}
          </p>
        </div>
        
        {loginError && (
          <Alert
            type="error"
            message={loginError}
            className="mb-4"
            onClose={() => setLoginError(null)}
          />
        )}
        
        {loginSuccess && (
          <Alert
            type="success"
            message={loginSuccess}
            className="mb-4"
            onClose={() => setLoginSuccess(null)}
          />
        )}
        
        <form onSubmit={formik.handleSubmit}>
          <Input
            id="email"
            name="email"
            type="email"
            label={t('common.email')}
            placeholder={t('auth.login.emailPlaceholder')}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.email && formik.errors.email}
            touched={formik.touched.email}
            required
          />
          
          <Input
            id="password"
            name="password"
            type="password"
            label={t('common.password')}
            placeholder={t('auth.login.passwordPlaceholder')}
            value={formik.values.password}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.password && formik.errors.password}
            touched={formik.touched.password}
            required
          />
          
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formik.values.rememberMe}
                onChange={formik.handleChange}
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                {t('common.rememberMe')}
              </label>
            </div>
            
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
          </div>
          
          <div className="mb-6">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={formik.isSubmitting}
              loading={formik.isSubmitting}
            >
              {t('auth.login.loginButton')}
            </Button>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.login.registerPrompt')}{' '}
            <Link
              to="/register"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t('auth.login.registerLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;