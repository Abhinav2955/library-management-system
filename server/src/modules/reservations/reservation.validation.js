const { z } = require('zod');

const createReservationSchema = z.object({
  body: z.object({ bookId: z.string().uuid() }),
});

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listReservationsSchema = z.object({
  query: z.object({
    status: z.enum(['waiting', 'ready', 'fulfilled', 'cancelled', 'expired']).optional(),
    bookId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

module.exports = { createReservationSchema, idParamSchema, listReservationsSchema };