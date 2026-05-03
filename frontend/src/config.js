const trimTrailingSlash = (value) => value.replace(/\/+$/, '');

const normalizeApiBaseUrl = (value) => {
  const baseUrl = trimTrailingSlash(value || 'http://localhost:5001/api');

  const normalized = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  return `${normalized}/`;
};

export const API_BASE_URL = normalizeApiBaseUrl(process.env.REACT_APP_API_URL);

export const API_ORIGIN = trimTrailingSlash(
  process.env.REACT_APP_API_ORIGIN || API_BASE_URL.replace(/\/api\/?$/, '')
);

export const toAbsoluteAssetUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return url;
  }

  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:') || url.startsWith('blob:')) {
    return url;
  }

  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
};
