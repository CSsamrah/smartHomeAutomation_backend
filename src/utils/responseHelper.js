
const sendSuccess = (res, statusCode, message, data = null, meta = null) => {
  const payload = { status: 'success', message };
  if (data !== null) payload.data = data;
  if (meta !== null) payload.meta = meta;
  return res.status(statusCode).json(payload);
};


const sendError = (res, statusCode, message, errors = null) => {
  const payload = {
    status: statusCode >= 500 ? 'error' : 'fail',
    message,
  };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

module.exports = { sendSuccess, sendError };