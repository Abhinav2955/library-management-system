import axiosClient from './axiosClient';

// Mirrors GET /api/v1/books exactly — only params the backend actually
// supports are sent, so an empty/undefined filter is dropped rather than
// serialized as "undefined" in the query string.
export const listBooks = async (params = {}) => {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await axiosClient.get('/books', { params: cleaned });
  return res.data.data; // { books, meta }
};

export const getBook = async (id) => {
  const res = await axiosClient.get(`/books/${id}`);
  return res.data.data;
};