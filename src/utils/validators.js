import { createHttpError } from "./httpError.js";

export function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw createHttpError(400, "Missing required fields.", { missing });
  }
}

export function requirePositiveAmount(value, fieldName) {
  if (typeof value !== "number" || Number.isNaN(value) || value <= 0) {
    throw createHttpError(400, `${fieldName} must be a positive number.`);
  }
}

export function requireEnum(value, allowedValues, fieldName) {
  if (!allowedValues.includes(value)) {
    throw createHttpError(400, `${fieldName} must be one of: ${allowedValues.join(", ")}.`);
  }
}
