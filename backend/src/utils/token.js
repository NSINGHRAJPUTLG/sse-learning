const jwt = require('jsonwebtoken');
const env = require('../config/env');

function generateAccessToken(user) {
  return jwt.sign(user, env.jwtAccessSecret, { expiresIn: '15m' });
}

function generateRefreshToken(user) {
  return jwt.sign(user, env.jwtRefreshSecret, { expiresIn: '7d' });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtAccessSecret);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwtRefreshSecret);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken: generateAccessToken,
  signRefreshToken: generateRefreshToken,
};
