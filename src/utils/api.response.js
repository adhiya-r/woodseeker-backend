class ApiResponse {
  static success(data = null, message = 'Success') {
    return {
      success: true,
      message,
      data
    };
  }

  static error(message = 'Internal Server Error', statusCode = 500, errors = null) {
    return {
      success: false,
      message,
      statusCode,
      errors
    };
  }
}

module.exports = { ApiResponse };