// Set test environment variables before any test file loads
process.env.JWT_SECRET    = 'test_secret'
process.env.JWT_EXPIRES_IN = '1h'
process.env.NODE_ENV      = 'test'
process.env.PORT          = '5001'
