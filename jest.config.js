const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './'
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  testEnvironment: "jsdom",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  testMatch: [
    "<rootDir>/src/**/__tests__/**/*.{js,jsx,ts,tsx}",
    "<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}",
    "**/?(*.)+(test).[tj]s?(x)"
  ],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
  ],
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase|ws|@types)/)"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^lucide-react$": "<rootDir>/__mocks__/lucide-react.js",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^next/cache$": "<rootDir>/__mocks__/next-cache.js"
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/app/**/layout.tsx",
    "!src/app/**/page.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/error.tsx",
    "!src/app/**/not-found.tsx",
    "!src/lib/supabase-client.ts",
    "!src/middleware.ts",
    "!**/*.stories.*",
    "!**/.next/**",
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  // watchPlugins: [
  //   "jest-watch-typeahead/filename",
  //   "jest-watch-typeahead/testname",
  // ],
  resetMocks: true,
  clearMocks: true,
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)