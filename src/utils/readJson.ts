
import { readFileSync } from 'fs'

export const readJson = (jsonPath: string) => {
    try {
        const json = JSON.parse(readFileSync(jsonPath, 'utf8'));
        return json;
    } catch (_) {
        throw new TypeError(`${jsonPath} is not a valid JSON file.`);
    }
}