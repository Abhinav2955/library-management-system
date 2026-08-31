import axiosClient from './axiosClient';

export const listMyFines = async (params = {}) => {
  const res = await axiosClient.get('/fines/me', { params });
  return res.data.data;
};

export const createPaymentOrder = async (fineId) => {
  const res = await axiosClient.post(`/fines/${fineId}/create-order`);
  return res.data.data;
};

export const verifyPayment = async (fineId, payload) => {
  const res = await axiosClient.post(`/fines/${fineId}/verify-payment`, payload);
  return res.data.data;
};