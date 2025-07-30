import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import Layout from '../components/layout/Layout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import { useAuth } from '../utils/AuthContext';
import { userAPI } from '../utils/api';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, updateUserProfile } = useAuth();
  const [profileError, setProfileError] = useState(null);
  const [profileSuccess, setProfileSuccess] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await userAPI.getCurrentUser();
        setUserProfile(response.data.data);
      } catch (err) {
        console.error('Error fetching user profile:', err);
        setProfileError(t('profile.errorFetchingProfile'));
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [t]);

  const profileFormik = useFormik({
    initialValues: {
      name: userProfile?.name || user?.name || '',
      email: userProfile?.email || user?.email || '',
      phone: userProfile?.phone || ''
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      name: Yup.string().required(t('common.required')),
      email: Yup.string().email(t('common.invalidEmail')).required(t('common.required')),
      phone: Yup.string().matches(/^[0-9+\-\s()]*$/, t('common.invalidPhone'))
    }),
    onSubmit: async (values, { setSubmitting }) => {
      setProfileError(null);
      setProfileSuccess(null);
      
      try {
        await userAPI.updateProfile(values);
        await updateUserProfile(values);
        setProfileSuccess(t('profile.updateSuccess'));
      } catch (err) {
        console.error('Error updating profile:', err);
        setProfileError(err.message || t('profile.updateError'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  const passwordFormik = useFormik({
    initialValues: {
      current_password: '',
      new_password: '',
      confirm_password: ''
    },
    validationSchema: Yup.object({
      current_password: Yup.string().required(t('common.required')),
      new_password: Yup.string().min(8, t('common.passwordTooShort')).required(t('common.required')),
      confirm_password: Yup.string()
        .oneOf([Yup.ref('new_password'), null], t('profile.passwordMismatch'))
        .required(t('common.required'))
    }),
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setPasswordError(null);
      setPasswordSuccess(null);
      
      try {
        await userAPI.changePassword(values.current_password, values.new_password);
        setPasswordSuccess(t('profile.passwordUpdateSuccess'));
        resetForm();
      } catch (err) {
        console.error('Error changing password:', err);
        setPasswordError(err.message || t('profile.passwordUpdateError'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('profile.title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('profile.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Information */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
              {t('profile.personalInformation')}
            </h2>
            
            {profileError && (
              <Alert
                type="error"
                message={profileError}
                className="mb-4"
                onClose={() => setProfileError(null)}
              />
            )}
            
            {profileSuccess && (
              <Alert
                type="success"
                message={profileSuccess}
                className="mb-4"
                onClose={() => setProfileSuccess(null)}
              />
            )}
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            ) : (
              <form onSubmit={profileFormik.handleSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    id="name"
                    name="name"
                    label={t('common.name')}
                    value={profileFormik.values.name}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    error={profileFormik.touched.name && profileFormik.errors.name}
                    touched={profileFormik.touched.name}
                    required
                  />
                  
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    label={t('common.email')}
                    value={profileFormik.values.email}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    error={profileFormik.touched.email && profileFormik.errors.email}
                    touched={profileFormik.touched.email}
                    required
                  />
                  
                  <Input
                    id="phone"
                    name="phone"
                    label={t('common.phone')}
                    value={profileFormik.values.phone}
                    onChange={profileFormik.handleChange}
                    onBlur={profileFormik.handleBlur}
                    error={profileFormik.touched.phone && profileFormik.errors.phone}
                    touched={profileFormik.touched.phone}
                  />
                  
                  <div className="md:col-span-2">
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        variant="primary"
                        loading={profileFormik.isSubmitting}
                        disabled={profileFormik.isSubmitting}
                      >
                        {t('profile.saveChanges')}
                      </Button>
                    </div>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div>
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('profile.accountInformation')}
            </h2>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('common.role')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {t(`common.${userProfile?.role || user?.role}`)}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('profile.accountCreated')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {userProfile?.created_at 
                      ? new Date(userProfile.created_at).toLocaleDateString() 
                      : t('common.notAvailable')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('profile.lastLogin')}
                  </h3>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {userProfile?.last_login 
                      ? new Date(userProfile.last_login).toLocaleString() 
                      : t('common.notAvailable')}
                  </p>
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('profile.accountStatus')}
                  </h3>
                  <p className={`mt-1 text-sm ${
                    userProfile?.status === 'active' || user?.status === 'active'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {userProfile?.status === 'active' || user?.status === 'active'
                      ? t('common.active')
                      : t('common.inactive')}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Change Password */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('profile.changePassword')}
            </h2>
            
            {passwordError && (
              <Alert
                type="error"
                message={passwordError}
                className="mb-4"
                onClose={() => setPasswordError(null)}
              />
            )}
            
            {passwordSuccess && (
              <Alert
                type="success"
                message={passwordSuccess}
                className="mb-4"
                onClose={() => setPasswordSuccess(null)}
              />
            )}
            
            <form onSubmit={passwordFormik.handleSubmit}>
              <Input
                id="current_password"
                name="current_password"
                type="password"
                label={t('profile.currentPassword')}
                value={passwordFormik.values.current_password}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                error={passwordFormik.touched.current_password && passwordFormik.errors.current_password}
                touched={passwordFormik.touched.current_password}
                required
              />
              
              <Input
                id="new_password"
                name="new_password"
                type="password"
                label={t('profile.newPassword')}
                value={passwordFormik.values.new_password}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                error={passwordFormik.touched.new_password && passwordFormik.errors.new_password}
                touched={passwordFormik.touched.new_password}
                required
              />
              
              <Input
                id="confirm_password"
                name="confirm_password"
                type="password"
                label={t('profile.confirmPassword')}
                value={passwordFormik.values.confirm_password}
                onChange={passwordFormik.handleChange}
                onBlur={passwordFormik.handleBlur}
                error={passwordFormik.touched.confirm_password && passwordFormik.errors.confirm_password}
                touched={passwordFormik.touched.confirm_password}
                required
              />
              
              <div className="mt-6">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full"
                  loading={passwordFormik.isSubmitting}
                  disabled={passwordFormik.isSubmitting}
                >
                  {t('profile.updatePassword')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;