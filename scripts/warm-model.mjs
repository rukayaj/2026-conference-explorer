import path from 'node:path';
import fs from 'node:fs';
import { env, pipeline } from '@huggingface/transformers';
const root = path.resolve(import.meta.dirname, '..');
env.cacheDir = process.env.MODEL_CACHE_DIR || path.join(root, 'model-cache');
const { model, revision } = JSON.parse(fs.readFileSync(path.join(root, 'public', 'data', 'manifest.json')));
await pipeline('feature-extraction', model, { dtype: 'q8', revision });
console.log(`Cached ${model} at ${revision}`);
