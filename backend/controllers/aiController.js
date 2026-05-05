const axios = require('axios');
const { buildAdminInsights } = require('../services/userInsightsService');

const DEFAULT_HF_MODELS = [
    'Qwen/Qwen2.5-7B-Instruct',
    'google/gemma-2-2b-it',
    'meta-llama/Llama-3.2-1B-Instruct',
];
const LEGACY_UNSUPPORTED_MODELS = new Set([
    'google/flan-t5-large',
    'HuggingFaceTB/SmolLM3-3B',
    'Qwen/Qwen2.5-7B-Instruct-1M',
    'Qwen/Qwen2.5-7B-Instruct-1M:hf-inference',
    'Qwen/Qwen2.5-7B-Instruct-1M:preferred',
]);

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function extractErrorMessage(value) {
    if (typeof value === 'string') {
        return value.trim();
    }

    if (Array.isArray(value)) {
        return value.map((item) => extractErrorMessage(item)).filter(Boolean).join(' | ').trim();
    }

    if (value && typeof value === 'object') {
        return (
            normalizeText(value.message) ||
            normalizeText(value.error) ||
            normalizeText(value.detail) ||
            normalizeText(value.type) ||
            JSON.stringify(value)
        );
    }

    return '';
}

function buildDocumentationPrompt(productName, description) {
    return `Generate a professional product documentation for the following product.

Product Name: ${productName}
Description: ${description}

Include:
- Overview
- Key Features
- How to Use
- Safety Instructions
- FAQ (3 questions)
- Benefits

Write clearly and professionally.`;
}

function resolveModelNames() {
    const configuredModel = normalizeText(process.env.HF_MODEL);

    if (!configuredModel || LEGACY_UNSUPPORTED_MODELS.has(configuredModel)) {
        return [...DEFAULT_HF_MODELS];
    }

    return [configuredModel, ...DEFAULT_HF_MODELS.filter((model) => model !== configuredModel)];
}

function extractGeneratedText(payload) {
    if (typeof payload === 'string') {
        return payload.trim();
    }

    const messageContent = payload?.choices?.[0]?.message?.content;
    if (typeof messageContent === 'string') {
        return messageContent.trim();
    }

    if (Array.isArray(messageContent)) {
        return messageContent
            .map((part) => normalizeText(part?.text || part?.content || ''))
            .filter(Boolean)
            .join('\n')
            .trim();
    }

    return normalizeText(payload?.generated_text) || normalizeText(payload?.text) || '';
}

function isModelAvailabilityError(error) {
    const message = extractErrorMessage(error?.response?.data?.error) ||
        extractErrorMessage(error?.response?.data?.message) ||
        extractErrorMessage(error?.message);
    const normalizedMessage = String(message || '').trim().toLowerCase();

    return (
        normalizedMessage.includes('deprecated') ||
        normalizedMessage.includes('no longer supported') ||
        normalizedMessage.includes('unsupported by provider') ||
        normalizedMessage.includes('not supported by provider') ||
        (normalizedMessage.includes('model') && normalizedMessage.includes('not supported'))
    );
}

async function generateDocumentation(req, res) {
    try {
        const productName = normalizeText(req.body?.productName);
        const description = normalizeText(req.body?.description);

        if (!productName) {
            return res.status(400).json({ message: 'productName is required' });
        }

        if (!description) {
            return res.status(400).json({ message: 'description is required' });
        }

        const apiKey = normalizeText(process.env.HF_API_KEY);
        if (!apiKey) {
            return res.status(500).json({ message: 'HF_API_KEY is not configured on the backend' });
        }

        const modelNames = resolveModelNames();
        const prompt = buildDocumentationPrompt(productName, description);
        let lastError = null;

        for (const modelName of modelNames) {
            try {
                const response = await axios.post(
                    'https://router.huggingface.co/v1/chat/completions',
                    {
                        model: modelName,
                        messages: [
                            {
                                role: 'system',
                                content:
                                    'You write concise, professional product documentation for construction and industrial products.',
                            },
                            {
                                role: 'user',
                                content: prompt,
                            },
                        ],
                        max_tokens: 900,
                        temperature: 0.4,
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                        },
                        timeout: 90000,
                    }
                );

                const documentation = extractGeneratedText(response.data);
                if (!documentation) {
                    return res
                        .status(502)
                        .json({ message: 'Hugging Face did not return documentation text' });
                }

                return res.status(200).json({ documentation });
            } catch (error) {
                lastError = error;
                if (!isModelAvailabilityError(error)) {
                    break;
                }
            }
        }

        throw lastError || new Error('Failed to generate product documentation');
    } catch (error) {
        const message =
            extractErrorMessage(error.response?.data?.error) ||
            extractErrorMessage(error.response?.data?.message) ||
            extractErrorMessage(error.message) ||
            'Failed to generate product documentation';

        return res.status(error.response?.status || 500).json({ message });
    }
}

async function getUserInsights(req, res) {
    try {
        const result = await buildAdminInsights({
            userId: req.body?.userId,
            metrics: req.body?.metrics,
            limit: req.body?.limit,
        });

        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({
            message: error.message || 'Failed to generate user insights',
        });
    }
}

module.exports = {
    generateDocumentation,
    getUserInsights,
};
