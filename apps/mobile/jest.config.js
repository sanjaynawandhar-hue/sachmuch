module.exports = {
 preset: 'jest-expo',
 testMatch: ['<rootDir>/src/**/*.test.ts', '<rootDir>/src/**/*.test.tsx'],
 moduleNameMapper: { '^@sachmuch/core$': '<rootDir>/../../packages/core/src/index.ts' },
 transformIgnorePatterns: ['node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?(-.*)?|@expo(nent)?/.*|@react-navigation/.*|react-navigation|react-native-svg)/)'],
};
