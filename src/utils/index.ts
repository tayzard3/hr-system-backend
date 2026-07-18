const toCamelCase = (str: string) => {
	if (typeof str !== 'string' || str.length === 0) {
		return ''
	}
	return str.replace(/([-_ ]\w)/g, (g) => g[1].toUpperCase())
}

const toSnakeCase = (str: string) => {
	if (typeof str !== 'string' || str.length === 0) {
		return ''
	}
	// Convert camelCase to snake_case, then replace spaces and hyphens with underscores, and convert to lowercase
	return str
		.replace(/([A-Z])/g, '_$1') // Add underscore before uppercase letters
		.replace(/[- ]/g, '_') // Replace hyphens and spaces with underscores
		.toLowerCase() // Convert the entire string to lowercase
}

export const convertStringCase = (
	str: string,
	targetCase: 'camel' | 'snake'
) => {
	if (typeof str !== 'string') {
		throw new Error('Input must be a string.')
	}

	switch (targetCase) {
		case 'camel':
			return toCamelCase(str)
		case 'snake':
			return toSnakeCase(str)
		default:
			throw new Error('Invalid targetCase. Must be "camel" or "snake".')
	}
}
