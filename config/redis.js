const Redis = require('ioredis');
const logger = console;

// Redis configuration
const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Handle Redis events
redisClient.on('connect', () => {
    logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
    logger.error('Redis client error:', err);
});

// Cache utility functions
const DEFAULT_EXPIRATION = 3600; // 1 hour in seconds

const cacheUtils = {
    /**
     * Get data from cache
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached data or null
     */
    async get(key) {
        try {
            const data = await redisClient.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            logger.error('Cache get error:', error);
            return null;
        }
    },

    /**
     * Set data in cache
     * @param {string} key - Cache key
     * @param {any} value - Data to cache
     * @param {number} expiration - Expiration time in seconds
     */
    async set(key, value, expiration = DEFAULT_EXPIRATION) {
        try {
            const stringValue = JSON.stringify(value);
            await redisClient.setex(key, expiration, stringValue);
        } catch (error) {
            logger.error('Cache set error:', error);
        }
    },

    /**
     * Delete data from cache
     * @param {string} key - Cache key
     */
    async del(key) {
        try {
            await redisClient.del(key);
        } catch (error) {
            logger.error('Cache delete error:', error);
        }
    },

    /**
     * Clear all cache
     */
    async clear() {
        try {
            await redisClient.flushall();
        } catch (error) {
            logger.error('Cache clear error:', error);
        }
    }
};

module.exports = {
    redisClient,
    cacheUtils
};