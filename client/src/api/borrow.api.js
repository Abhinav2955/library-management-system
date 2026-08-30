import axiosClient from './axiosClient';

export const checkoutBook = async (bookId) => {
  const res = await axiosClient.post('/borrow/checkout', { bookId });
  return res.data.data;
};

export const renewLoan = async (recordId) => {
  const res = await axiosClient.post(`/borrow/${recordId}/renew`);
  return res.data.data;
};

export const listMyLoans = async (params = {}) => {
  const res = await axiosClient.get('/borrow/me', { params });
  return res.data.data; // { records, meta }
};

// Admin/librarian inventory management
export const addCopies = async ({ bookId, quantity, shelfLocation }) => {
  const res = await axiosClient.post('/borrow/copies', { bookId, quantity, shelfLocation });
  return res.data.data;
};

export const listCopiesForBook = async (bookId) => {
  const res = await axiosClient.get('/borrow/copies', { params: { bookId } });
  return res.data.data;
};

export const retireCopy = async (copyId) => {
  const res = await axiosClient.post(`/borrow/copies/${copyId}/retire`);
  return res.data.data;
};