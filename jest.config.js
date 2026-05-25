/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      displayName: 'html-to-structured-text',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/packages/html-to-structured-text/__tests__/**/*.test.ts',
      ],
      extensionsToTreatAsEsm: ['.ts'],
      moduleNameMapper: {
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transform: {
        '^.+\\.tsx?$': [
          'ts-jest',
          {
            useESM: true,
            tsconfig: {
              module: 'ESNext',
              moduleResolution: 'Bundler',
              target: 'ES2020',
              esModuleInterop: true,
              allowSyntheticDefaultImports: true,
              isolatedModules: true,
            },
          },
        ],
      },
    },
    {
      displayName: 'other',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/packages/**/__tests__/**/*.test.ts'],
      testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/',
        '/packages/html-to-structured-text/',
      ],
      snapshotFormat: {
        printBasicPrototype: true,
        escapeString: true,
      },
    },
  ],
};
