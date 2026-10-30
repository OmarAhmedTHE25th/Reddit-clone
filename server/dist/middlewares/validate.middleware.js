function formatZodErrors(error) {
    return error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
    }));
}
export function validateBody(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({
                error: 'Validation failed',
                details: formatZodErrors(result.error),
            });
            return;
        }
        req.body = result.data;
        next();
    };
}
export function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (!result.success) {
            res.status(400).json({
                error: 'Invalid query parameters',
                details: formatZodErrors(result.error),
            });
            return;
        }
        // Attach parsed, coerced query values for downstream controllers
        res.locals.validatedQuery = result.data;
        next();
    };
}
