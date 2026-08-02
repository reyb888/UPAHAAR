import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Generates content using the Gemini API, with automatic fallback to the backup API key.
 * 
 * @param {string|Array} contents - The contents to generate (either prompt string, or parts/contents array).
 * @param {Object} options - Options containing model name or specific configurations.
 * @param {string} [options.model="gemini-2.5-flash"] - The Gemini model to use.
 * @returns {Promise<Object>} The standard Gemini API result object.
 */
export async function generateGeminiContent(contents, options = {}) {
    const modelName = options.model || 'gemini-2.5-flash';
    const primaryKey = process.env.GEMINI_API_KEY;
    const backupKey = process.env.GEMINI_BACKUP_API_KEY;

    if (!primaryKey && !backupKey) {
        throw new Error('Gemini API is not configured (missing GEMINI_API_KEY and GEMINI_BACKUP_API_KEY)');
    }

    // Try primary key if configured
    if (primaryKey) {
        try {
            console.log('Attempting generation with primary Gemini API key...');
            const genAI = new GoogleGenerativeAI(primaryKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(contents);
            // Verify we can get a response object to confirm it actually succeeded
            if (result && result.response) {
                return result;
            }
        } catch (error) {
            console.error('Primary Gemini API key error:', error.message || error);
            if (!backupKey) {
                throw error; // Propagate error if there is no backup key configured
            }
            console.warn('Switching to backup Gemini API key...');
        }
    }

    // Try backup key if primary failed or wasn't set, and backup is set
    if (backupKey) {
        try {
            console.log('Attempting generation with backup Gemini API key...');
            const genAI = new GoogleGenerativeAI(backupKey);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(contents);
            if (result && result.response) {
                return result;
            }
        } catch (error) {
            console.error('Backup Gemini API key error:', error.message || error);
            throw error; // Propagate the error if the backup also fails
        }
    }

    throw new Error('Failed to generate content with available Gemini API keys.');
}
