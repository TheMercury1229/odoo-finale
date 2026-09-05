export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      return res.status(400).json({
        error: issue.message,
        ...(issue.path[0] ? { field: issue.path[0] } : {}),
      });
    }

    req.validatedBody = result.data;
    return next();
  };
}
