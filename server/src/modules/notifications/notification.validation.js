const { z } = require('zod');

const idParamSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const listNotificationsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

module.exports = { idParamSchema, listNotificationsSchema };