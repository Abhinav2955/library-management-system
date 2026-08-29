const { z } = require('zod');

const topBooksSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  }),
});

const circulationStatsSchema = z.object({
  query: z.object({
    days: z.coerce.number().int().min(1).max(365).optional().default(30),
  }),
});

module.exports = { topBooksSchema, circulationStatsSchema };