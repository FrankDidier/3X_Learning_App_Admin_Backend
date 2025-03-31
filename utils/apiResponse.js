/**
 * Standard API response formatter
 */
class ApiResponse {
  /**
   * Success response
   * @param {Object} data - Response data
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code
   */
  static success(res, data = null, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code
   * @param {String} errorCode - Error code for client handling
   */
  static error(res, message = 'Error occurred', statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode
    });
  }

  /**
   * Pagination response
   * @param {Object} res - Express response object
   * @param {Array} data - Paginated data
   * @param {Number} page - Current page
   * @param {Number} limit - Items per page
   * @param {Number} total - Total items count
   * @param {String} message - Success message
   */
  static paginate(res, data, page, limit, total, message = 'Success') {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  }
}

module.exports = ApiResponse;