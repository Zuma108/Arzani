export const apiDebug = (req, res, next) => {
    console.log('API Request:', {
        method: req.method,
        path: req.path,
        headers: req.headers,
        body: req.body
    });
    next();
};
