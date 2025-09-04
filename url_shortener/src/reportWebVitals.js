import { log } from './utils/logger.jsx';

const reportWebVitals = onPerfEntry => {
  log('Reporting web vitals', { action: 'reportWebVitals', status: 'start' });
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS((metric) => {
        onPerfEntry(metric);
        log('CLS metric captured', { action: 'reportWebVitals', metric: 'CLS', value: metric.value });
      });
      getFID((metric) => {
        onPerfEntry(metric);
        log('FID metric captured', { action: 'reportWebVitals', metric: 'FID', value: metric.value });
      });
      getFCP((metric) => {
        onPerfEntry(metric);
        log('FCP metric captured', { action: 'reportWebVitals', metric: 'FCP', value: metric.value });
      });
      getLCP((metric) => {
        onPerfEntry(metric);
        log('LCP metric captured', { action: 'reportWebVitals', metric: 'LCP', value: metric.value });
      });
      getTTFB((metric) => {
        onPerfEntry(metric);
        log('TTFB metric captured', { action: 'reportWebVitals', metric: 'TTFB', value: metric.value });
      });
      log('Web vitals reporting initialized', { action: 'reportWebVitals', status: 'complete' });
    });
  } else {
    log('Web vitals reporting skipped', { action: 'reportWebVitals', status: 'skipped', reason: 'No valid performance entry function' });
  }
};

export default reportWebVitals;
