export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      return res.status(400).json({
        error: issue.message,
        ...(issue.path[0] ? { field: issue.path[0] } : {}),
      });
    }

    req.validatedQuery = result.data;
    return next();
  };
}
