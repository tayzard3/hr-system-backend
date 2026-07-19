/** Jest config for hr_system_backend. Added alongside the first tests for the
 * auth-refresh-token feature — see CLAUDE.md ("set it up if you add the first tests"). */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	rootDir: '.',
	roots: ['<rootDir>/src'],
	setupFiles: ['dotenv/config'],
	testMatch: ['**/__tests__/**/*.test.ts'],
	moduleNameMapper: {
		// uuid@14 ships ESM-only and is pulled in transitively by sequelize; Jest runs
		// tests under CommonJS, so we stub it (see test/__mocks__/uuid.js for details).
		'^uuid$': '<rootDir>/test/__mocks__/uuid.js',
	},
	transform: {
		'^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.jest.json' }],
	},
	clearMocks: true,
}
