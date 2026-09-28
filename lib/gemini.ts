import { GoogleGenAI } from "@google/genai";
import type { ZodType } from "zod";

const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY_MS = 600;

function getModelName(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({ apiKey });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Extract a JSON object from arbitrary model output (strips markdown fences). */
export function extractJson(text: string): string {
  const trimmed = text.trim();

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model output.");
  }

  return candidate.slice(start, end + 1);
}

export interface GenerateJsonOptions {
  temperature?: number;
  maxOutputTokens?: number;
  maxRetries?: number;
}

/**
 * Calls Gemini and returns validated JSON that conforms to the provided Zod
 * schema. Retries safely on transient failures and schema mismatches.
 */
export async function generateStructuredJson<S>(
  prompt: string,
  schema: ZodType<S>,
  options: GenerateJsonOptions = {}
): Promise<S> {
  const {
    temperature = 0.4,
    maxOutputTokens = 8192,
    maxRetries = DEFAULT_MAX_RETRIES,
  } = options;

  const client = getGeminiClient();
  const model = getModelName();

  console.log(
    `[gemini] start model=${model} attempt=1/${maxRetries + 1} maxOutputTokens=${maxOutputTokens} promptChars=${prompt.length}`
  );

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_DELAY_MS * attempt);
    }

    try {
      const response = await client.models.generateContent({
        model,
        contents: prompt,
        config: {
          temperature,
          maxOutputTokens,
          responseMimeType: "application/json",
        },
      });

      const text = response.text;

      if (!text) {
        throw new Error("Gemini returned an empty response.");
      }

      const json = extractJson(text);
      const parsed: unknown = JSON.parse(json);
      const result = schema.parse(parsed);
      console.log(`[gemini] ok attempt=${attempt + 1} responseChars=${text.length}`);
      return result;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error);
      const isSchemaError = error instanceof Error && "issues" in (error as object);
      lastError = error;

      const status = (error as { status?: unknown })?.status;
      console.log(
        `[gemini] failed attempt=${attempt + 1}/${maxRetries + 1} model=${model} schemaError=${isSchemaError} status=${String(status)} error=${message}`
      );

      // Non-retryable when the API key/env is misconfigured.
      if (message.includes("API key") || message.includes("is not configured")) {
        throw error;
      }

      // Only retry schema-shape issues when we have attempts left; Gemini
      // usually corrects the output shape on a retry.
      if (attempt === maxRetries && !isSchemaError && attempt > 0) {
        break;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to generate structured AI output.");
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}