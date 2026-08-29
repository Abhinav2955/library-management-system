import axiosClient from './axiosClient';

export const listMyFines = async (params = {}) => {
  const res = await axiosClient.get('/fines/me', { params });
  return res.data.data; // { fines, pendingBalance, meta }
};

export const payFine = async (fineId) => {
  const res = await axiosClient.post(`/fines/${fineId}/pay`);
  return res.data.data;
};