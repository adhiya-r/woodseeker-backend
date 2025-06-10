const { ApiResponse } = require('../utils/api.response');

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.message === 'Product not found') {
    return res.status(404).json(ApiResponse.error('Product not found', 404));
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json(ApiResponse.error('Product already exists', 409));
  }

  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json(ApiResponse.error('Invalid category reference', 400));
  }

  // Default error
  res.status(500).json(ApiResponse.error('Internal Server Error', 500));
};

module.exports = errorHandler;