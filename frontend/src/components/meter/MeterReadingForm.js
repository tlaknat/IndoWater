import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { meterAPI } from '../../utils/api';
import Input from '../common/Input';
import Button from '../common/Button';
import Alert from '../common/Alert';

const MeterReadingForm = ({ meterId, onSubmit }) => {
  const { t } = useTranslation();
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [meterInfo, setMeterInfo] = useState(null);
  const [loadingMeter, setLoadingMeter] = useState(false);
  const [lastReading, setLastReading] = useState(null);

  useEffect(() => {
    const fetchMeterInfo = async () => {
      if (!meterId) return;
      
      setLoadingMeter(true);
      try {
        const meterResponse = await meterAPI.getMeter(meterId);
        setMeterInfo(meterResponse.data.data);
        
        const readingsResponse = await meterAPI.getMeterReadings(meterId, { limit: 1 });
        if (readingsResponse.data.data.length > 0) {
          setLastReading(readingsResponse.data.data[0]);
        } else {
          // If no readings, use initial reading from meter info
          setLastReading({
            reading: meterResponse.data.data.initial_reading,
            reading_date: meterResponse.data.data.installation_date
          });
        }
      } catch (err) {
        console.error('Error fetching meter info:', err);
        setError(t('meter.errorFetchingMeter'));
      } finally {
        setLoadingMeter(false);
      }
    };

    fetchMeterInfo();
  }, [meterId, t]);

  const validationSchema = Yup.object({
    reading: Yup.number()
      .required(t('common.required'))
      .min(
        lastReading ? lastReading.reading : 0, 
        t('meter.readingMustBeGreater')
      ),
    reading_date: Yup.date()
      .required(t('common.required'))
      .max(new Date(), t('meter.dateCannotBeFuture')),
    notes: Yup.string()
  });

  const formik = useFormik({
    initialValues: {
      reading: '',
      reading_date: new Date().toISOString().split('T')[0],
      notes: ''
    },
    validationSchema,
    enableReinitialize: true,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setError(null);
      setSuccess(null);
      
      try {
        await onSubmit({
          ...values,
          meter_id: meterId
        });
        setSuccess(t('meter.readingSuccess'));
        resetForm();
        
        // Refresh meter info and last reading
        const readingsResponse = await meterAPI.getMeterReadings(meterId, { limit: 1 });
        if (readingsResponse.data.data.length > 0) {
          setLastReading(readingsResponse.data.data[0]);
        }
      } catch (err) {
        setError(err.message || t('common.errorOccurred'));
      } finally {
        setSubmitting(false);
      }
    }
  });

  if (loadingMeter) {
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

  if (!meterInfo) {
    return (
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <Alert
          type="error"
          message={error || t('meter.meterNotFound')}
          className="mb-4"
        />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-6">
        {t('meter.addReading')}
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
          {t('meter.meterInfo')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('meter.meterNumber')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.meter_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.customer')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.property')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.property_name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.unitNumber')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{meterInfo.unit_number}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('meter.lastReading')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {lastReading ? lastReading.reading : meterInfo.initial_reading} m³
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('meter.lastReadingDate')}</p>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {lastReading ? new Date(lastReading.reading_date).toLocaleDateString() : new Date(meterInfo.installation_date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
      
      <form onSubmit={formik.handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            id="reading"
            name="reading"
            type="number"
            label={t('meter.reading')}
            value={formik.values.reading}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.reading && formik.errors.reading}
            touched={formik.touched.reading}
            required
          />
          
          <Input
            id="reading_date"
            name="reading_date"
            type="date"
            label={t('meter.readingDate')}
            value={formik.values.reading_date}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            error={formik.touched.reading_date && formik.errors.reading_date}
            touched={formik.touched.reading_date}
            required
          />
          
          <div className="md:col-span-2">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.notes')}
            </label>
            <textarea
              id="notes"
              name="notes"
              rows="3"
              value={formik.values.notes}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white"
            ></textarea>
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
            disabled={formik.isSubmitting || meterInfo.status !== 'active'}
          >
            {t('common.submit')}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default MeterReadingForm;