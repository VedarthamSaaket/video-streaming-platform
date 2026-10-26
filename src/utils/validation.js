const { z } = require('zod');

const createVideoSchema = z.object({
  title: z.string().trim().min(1, 'title is required').max(200),
  description: z.string().trim().max(2000).optional().default(''),
  uploadedBy: z.string().trim().max(100).optional().default('anonymous'),
});

const updateVideoSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    uploadedBy: z.string().trim().max(100).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'at least one field is required',
  });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
});

function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: result.error.flatten() };
  }
  return { ok: true, data: result.data };
}

module.exports = { createVideoSchema, updateVideoSchema, listQuerySchema, parse };
