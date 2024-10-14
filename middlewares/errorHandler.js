const {StatusCode} = require ("../config/StatusCode");

const errorHandler = ((err, req, res, next) => {
    console.error(err.message);
    
    const statusCode = err.statusCode || StatusCode.INTERNAL_SERVER_ERROR;
    const message = err.message || 'Internal Server Error';
    
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message
    });
  });


module.exports = errorHandler;