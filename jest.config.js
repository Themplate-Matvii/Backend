module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@constants/(.*)$': '<rootDir>/src/constants/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@docs/(.*)$': '<rootDir>/src/docs/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json',
      diagnostics: false,
    }
  }
};
