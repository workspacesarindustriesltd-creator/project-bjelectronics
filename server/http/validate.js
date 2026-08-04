
export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const error = new Error("Validation failed.");
  error.status = 400;
  error.details = result.error.flatten();
  throw error;
}
