/**
 * Utility class for standardizing API responses
 */
class ApiResponse {
  /**
   * Send a success response
   * @param {Object} res - Express response object
   * @param {*} data - Data to send in response
   * @param {String} message - Success message
   * @param {Number} statusCode - HTTP status code (default: 200)
   */
  static success(res, data, message = '操作成功', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data
    });
  }

  /**
   * Send an error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   * @param {Number} statusCode - HTTP status code (default: 400)
   * @param {String} errorCode - Error code for frontend handling
   */
  static error(res, message, statusCode = 400, errorCode = 'BAD_REQUEST') {
    return res.status(statusCode).json({
      success: false,
      message,
      error: errorCode
    });
  }

  /**
   * Send a paginated response
   * @param {Object} res - Express response object
   * @param {Array} data - Data array to send in response
   * @param {Number} page - Current page number
   * @param {Number} limit - Number of items per page
   * @param {Number} total - Total number of items
   * @param {String} message - Success message
   */
  static paginate(res, data, page, limit, total, message = '获取数据成功') {
    const currentPage = parseInt(page, 10) || 1;
    const perPage = parseInt(limit, 10) || 10;
    
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total,
        page: currentPage,
        limit: perPage,
        pages: Math.ceil(total / perPage)
      }
    });
  }

  /**
   * Send a not found response
   * @param {Object} res - Express response object
   * @param {String} item - The item that was not found
   */
  static notFound(res, item = 'Resource') {
    return this.error(res, `${item} not found`, 404, 'NOT_FOUND');
  }

  /**
   * Send an unauthorized response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static unauthorized(res, message = '未授权访问') {
    return this.error(res, message, 401, 'UNAUTHORIZED');
  }

  /**
   * Send a forbidden response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static forbidden(res, message = '禁止访问') {
    return this.error(res, message, 403, 'FORBIDDEN');
  }

  /**
   * Send a validation error response
   * @param {Object} res - Express response object
   * @param {String} message - Error message
   */
  static validationError(res, message = '输入验证失败') {
    return this.error(res, message, 400, 'VALIDATION_ERROR');
  }
}

module.exports = ApiResponse;