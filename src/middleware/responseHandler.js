const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const errorResponse = (res, message, statusCode = 500) => {
  res.status(statusCode).json({
    success: false,
    message,
    data: null
  });
};

module.exports = {
  successResponse,
  errorResponse
};