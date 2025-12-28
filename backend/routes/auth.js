const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  verifyEmail,
  resendVerification,
  getUserStats
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// List of disposable/temporary email domains to block
const disposableEmailDomains = [
  'tempmail.com', 'throwaway.com', 'guerrillamail.com', 'mailinator.com',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'getnada.com', 'maildrop.cc', 'dispostable.com'
];

// List of trusted email providers (optional - can be expanded)
const trustedEmailProviders = [
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com',
  'yahoo.com', 'yahoo.co.in', 'icloud.com', 'me.com', 'mac.com',
  'protonmail.com', 'proton.me', 'zoho.com', 'aol.com', 'mail.com',
  'gmx.com', 'gmx.net', 'yandex.com', 'tutanota.com', 'fastmail.com'
];

// Custom email validator
const isValidEmail = (email) => {
  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) return false;
  
  // Block disposable emails
  if (disposableEmailDomains.includes(domain)) {
    return false;
  }
  
  return true;
};

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .custom((value) => {
      if (!isValidEmail(value)) {
        throw new Error('Temporary or disposable email addresses are not allowed. Please use a real email (Gmail, Outlook, Yahoo, etc.)');
      }
      return true;
    }),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .matches(/\d/)
    .withMessage('Password must contain at least one number')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Routes
router.post('/register', registerValidation, register);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.get('/stats', protect, getUserStats);
router.post('/verify-email', protect, verifyEmail);
router.post('/resend-verification', protect, resendVerification);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);

module.exports = router;
