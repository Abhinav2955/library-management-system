import axiosClient from './axiosClient';

export const listMyNotifications = async (params = {}) => {
  const res = await axiosClient.get('/notifications/me', { params });
  return res.data.data; // { notifications, unreadCount, meta }
};

export const markNotificationRead = async (id) => {
  const res = await axiosClient.post(`/notifications/${id}/read`);
  return res.data.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axiosClient.post('/notifications/read-all');
  return res.data.data;
};