import axios from 'axios';
import { API_BASE_URL } from './config';

const apiService = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

apiService.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiService.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }

    if (error.code === 'ECONNABORTED') {
      error.userMessage = 'The server is taking too long to respond. Please check the backend deployment.';
    } else if (!error.response) {
      error.userMessage = 'The backend is not reachable right now. Please check the Railway deployment URL.';
    }

    return Promise.reject(error);
  }
);

export default apiService;
