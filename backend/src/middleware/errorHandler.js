function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const payload = {
    message: error.message || 'Something went wrong',
  };

  if (process.env.NODE_ENV !== 'production') {
    payload.stack = error.stack;
  }

  res.status(statusCode).json(payload);
}

module.exports = errorHandler;
