/* eslint-disable no-console */
import Redis, { RedisOptions } from 'ioredis'

class RedisUtility {
	private redis: Redis

	constructor(options?: RedisOptions) {
		this.redis = new Redis({
			port: options?.port || 6379,
			host: options?.host || 'localhost',
			password: options?.password || undefined,
			maxRetriesPerRequest: options?.maxRetriesPerRequest || 3,
			reconnectOnError: (err) => {
				// Reconnect on certain types of errors
				const targetError = 'READONLY'
				if (err.message.includes(targetError)) {
					return true // Reconnect on readonly error
				}
				return false
			},
			...options,
		})
	}

	public async setCache<T>(
		key: string,
		value: T,
		ttlSeconds?: number
	): Promise<void> {
		try {
			const stringValue = JSON.stringify(value)
			if (ttlSeconds) {
				await this.redis.set(key, stringValue, 'EX', ttlSeconds)
			} else {
				await this.redis.set(key, stringValue)
			}
		} catch (error) {
			console.error('Error setting cache:', error)
			throw new Error('Failed to set cache')
		}
	}

	public async getCache<T>(key: string): Promise<T | null> {
		try {
			const result = await this.redis.get(key)
			return result ? (JSON.parse(result) as T) : null
		} catch (error) {
			console.error('Error getting cache:', error)
			throw new Error('Failed to get cache')
		}
	}

	public async delCache(key: string): Promise<void> {
		try {
			await this.redis.del(key)
		} catch (error) {
			console.error('Error deleting cache:', error)
			throw new Error('Failed to delete cache')
		}
	}
}

export default RedisUtility
