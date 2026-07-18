import {
	AbilityBuilder,
	MongoAbility,
	Subject,
	createMongoAbility,
} from '@casl/ability'
import { AuthenticatedUser } from '../types/userTypes'

type AppAbility = MongoAbility<[string, Subject]>

function defineAbilitiesFor(user: AuthenticatedUser) {
	const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility)

	if (user.roles) {
		if (user.roles.includes('Developer')) {
			can('Manage', 'All') // 'Manage' implies all actions, 'All' implies all subjects
		}
	}

	if (user.permissions) {
		user.permissions.forEach((permission) => {
			const [subject, action] = permission.split('_')

			can(action, subject)
		})
	}

	return build()
}

export { defineAbilitiesFor, AppAbility }
