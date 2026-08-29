import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

const axiosClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends/receives the httpOnly refresh cookie
});

let accessToken = null;
let refreshPromise = null;

export const setAccessToken = (token) => {
  accessToken = token;
};

export const getAccessToken = () => accessToken;

axiosClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// On a 401 (expired access token), silently refresh once and retry the
// original request. Concurrent 401s share a single in-flight refresh call
// instead of each firing their own — avoids a refresh stampede.
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    // Critical guard: if the request that just failed with 401 IS the
    // refresh call itself (e.g. no valid refresh cookie exists yet, such as
    // on first visit), do NOT attempt to "refresh and retry" — that would
    // call /auth/refresh again, fail again, and loop forever. Just reject.
    const isRefreshCall = config?.url?.includes('/auth/refresh');
    if (response?.status === 401 && !config._retried && !isRefreshCall) {
      config._retried = true;
      try {
        if (!refreshPromise) {
          refreshPromise = axiosClient.post('/auth/refresh').finally(() => {
            refreshPromise = null;
          });
        }
        const refreshRes = await refreshPromise;
        setAccessToken(refreshRes.data.data.accessToken);
        config.headers.Authorization = `Bearer ${refreshRes.data.data.accessToken}`;
        return axiosClient(config);
      } catch (refreshError) {
        setAccessToken(null);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;