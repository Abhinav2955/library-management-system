import axiosClient from './axiosClient';

export const getDashboardSummary = async () => {
  const res = await axiosClient.get('/reports/dashboard');
  return res.data.data;
};

export const getTopBooks = async (limit = 10) => {
  const res = await axiosClient.get('/reports/top-books', { params: { limit } });
  return res.data.data;
};

export const getOverdueLoans = async () => {
  const res = await axiosClient.get('/reports/overdue');
  return res.data.data;
};

export const getFineRevenue = async () => {
  const res = await axiosClient.get('/reports/fines-revenue');
  return res.data.data;
};

export const getCirculationStats = async (days = 30) => {
  const res = await axiosClient.get('/reports/circulation', { params: { days } });
  return res.data.data;
};

// CSV comes back as raw text (not the { success, data } envelope other
// endpoints use), so this bypasses the usual res.data.data unwrap and
// triggers a real browser download via a temporary blob URL.
export const downloadOverdueCsv = async () => {
  const res = await axiosClient.get('/reports/overdue/export', { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'overdue-loans.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};