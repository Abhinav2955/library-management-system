import axiosClient, { setAccessToken } from './axiosClient';

export const register = async ({ name, email, password, phone }) => {
  const res = await axiosClient.post('/auth/register', { name, email, password, phone });
  return res.data.data;
};

export const login = async ({ email, password }) => {
  const res = await axiosClient.post('/auth/login', { email, password });
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
};

export const logout = async () => {
  await axiosClient.post('/auth/logout');
  setAccessToken(null);
};

export const fetchCurrentUser = async () => {
  const res = await axiosClient.get('/auth/me');
  return res.data.data;
};

export const silentRefresh = async () => {
  const res = await axiosClient.post('/auth/refresh');
  setAccessToken(res.data.data.accessToken);
  return res.data.data.user;
};