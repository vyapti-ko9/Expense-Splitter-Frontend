import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5500',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    // Ensure headers is a mutable object and then set Authorization on it
    if (!config.headers) {
      config.headers = {} as any;
    }

    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
