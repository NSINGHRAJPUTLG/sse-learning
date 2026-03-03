module.exports = function notFound(req, res) {
  res.status(404).json({ success: false, data: {}, message: 'Route not found' });
};
