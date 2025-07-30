import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../../utils/AuthContext';
import { settingsAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const RegisterForm = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const [registerError, setRegisterError] = useState(null);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [isRegistrationEnabled, setIsRegistrationEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if registration is enabled
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      try {
        const response = await settingsAPI.getFeatureSettings();
        setIsRegistrationEnabled(response.data.data.registration_enabled);
      } catch (error) {
        console.error('Failed to check registration status:', error);
        // Default to disabled if we can't check
        setIsRegistrationEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRegistrationStatus();
  }, []);

  const formik = useFormik({
    initialValues: {
      name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false
    },
    validationSchema: Yup.object({
      name: Yup.string()
        .required(t('common.required')),
      email: Yup.string()
        .email(t('common.invalidCredentials'))
        .required(t('common.required')),
      phone: Yup.string()
        .matches(/^[0-9+\-\s()]*$/, t('common.invalidCredentials')),
      password: Yup.string()
        .min(8, t('common.passwordTooShort'))
        .required(t('common.required')),
      confirmPassword: Yup.string()
        .oneOf([Yup.ref('password'), null], t('auth.register.passwordMismatch'))
        .required(t('common.required')),
      agreeToTerms: Yup.boolean()
        .oneOf([true], t('common.required'))
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setRegisterError(null);
      setRegisterSuccess(null);
      
      if (!isRegistrationEnabled) {
        setRegisterError(t('auth.register.registrationClosed'));
        setSubmitting(false);
        return;
      }
      
      try {
        const userData = {
          name: values.name,
          email: values.email,
          phone: values.phone,
          password: values.password
        };
        
        const result = await register(userData);
        
        if (result.success) {
          setRegisterSuccess(t('auth.register.registerSuccess'));
          resetForm();
        } else {
          setRegisterError(result.error);
        }
      } catch (error) {
        setRegisterError(t('auth.register.registerError'));
        console.error('Registration error:', error);
      } finally {
        setSubmitting(false);
      }
    }
  });

  if (isLoading) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isRegistrationEnabled) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('auth.register.title')}
            </h2>
          </div>
          
          <Alert
            type="warning"
            title={t('auth.register.registrationClosed')}
            message={t('auth.register.contactAdmin')}
            className="mb-6"
          />
          
          <div className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('auth.register.loginPrompt')}{' '}
              <Link
                to="/login"
                className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                {t('auth.register.loginLink')}
              </Link>
            </p>
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
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('auth.register.subtitle')}
          </p>
        </div>
        
        {registerError && (
          <Alert
            type="error"
            message={registerError}
            className="mb-4"
            onClose={() => setRegisterError(null)}
          />
        )}
        
        {registerSuccess && (
          <Alert
            type="success"
            message={registerSuccess}
            className="mb-4"
            onClose={() => setRegisterSuccess(null)}
          />
        )}
        
        <form onSubmit={formik.handleSubmit}>
          <Input
            id="name"
            name="name"
            type="text"
            label={t('common.name')}
            placeholder={t('auth.register.namePlaceholder')}
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
            placeholder={t('auth.register.emailPlaceholder')}
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
            type="tel"
            label={t('common.phone')}
            placeholder={t('auth.register.phonePlaceholder')}
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.phone && formik.errors.phone}
            touched={formik.touched.phone}
          />
          
          <Input
            id="password"
            name="password"
            type="password"
            label={t('common.password')}
            placeholder={t('auth.register.passwordPlaceholder')}
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
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            value={formik.values.confirmPassword}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.confirmPassword && formik.errors.confirmPassword}
            touched={formik.touched.confirmPassword}
            required
          />
          
          <div className="mb-6">
            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formik.values.agreeToTerms}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />
              <label
                htmlFor="agreeToTerms"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                {t('auth.register.termsAgreement')}{' '}
                <Link
                  to="/terms"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {t('auth.register.termsLink')}
                </Link>{' '}
                {t('common.and')}{' '}
                <Link
                  to="/privacy"
                  className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {t('auth.register.privacyLink')}
                </Link>
              </label>
            </div>
            {formik.touched.agreeToTerms && formik.errors.agreeToTerms && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                {formik.errors.agreeToTerms}
              </p>
            )}
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
              {t('auth.register.registerButton')}
            </Button>
          </div>
        </form>
        
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('auth.register.loginPrompt')}{' '}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
            >
              {t('auth.register.loginLink')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterForm;