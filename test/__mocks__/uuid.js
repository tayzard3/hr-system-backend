// Manual CJS stub for the `uuid` package (v14 is ESM-only and can't be required by Jest's
// CJS test runtime). Sequelize only needs `v1`/`v4` for generating default UUID column
// values internally — none of that codepath is exercised by these unit/integration tests.
module.exports = {
	v1: () => '00000000-0000-1000-8000-000000000000',
	v4: () => '00000000-0000-4000-8000-000000000000',
	v3: () => '00000000-0000-3000-8000-000000000000',
	v5: () => '00000000-0000-5000-8000-000000000000',
	validate: () => true,
	version: () => 4,
	NIL: '00000000-0000-0000-0000-000000000000',
}
