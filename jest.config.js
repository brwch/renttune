export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(js|jsx|mjs)$': 'babel-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  transformIgnorePatterns: [
    '/node_modules/(?!jsonwebtoken|mongodb)'
  ]
};