module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": "babel-jest"
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.cjs"],
  testMatch: ["**/?(*.)+(test).[tj]s?(x)"],
  transformIgnorePatterns: [
    "node_modules/(?!(isows|@supabase)/)"
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^lucide-react$": "<rootDir>/__mocks__/lucide-react.js",
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
    "^next/cache$": "<rootDir>/__mocks__/next-cache.js"
  }
}