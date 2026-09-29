import { randomInt } from "crypto";

/** Longueur minimale exigée pour tout nouveau mot de passe. */
export const MIN_PASSWORD_LENGTH = 8;

// Alphabet sans caractères ambigus (0/O, 1/l/I exclus) → lisible à l'œil nu
// quand l'agence recopie le mot de passe provisoire affiché une seule fois.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Génère un mot de passe provisoire fort, lisible, communiqué UNE seule fois
 * (affiché à l'écran de l'administrateur, jamais stocké ni envoyé en clair).
 * 3 blocs de 4 caractères sur 56 symboles ≈ 71 bits d'entropie.
 */
export function generateTempPassword(): string {
  const block = () =>
    Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${block()}-${block()}-${block()}`;
}

/**
 * Valide un nouveau mot de passe.
 * Retourne un message d'erreur français exploitable tel quel, ou null si le
 * mot de passe est acceptable.
 */
export function validateNewPassword(
  newPassword: unknown,
  currentPassword?: unknown
): string | null {
  if (typeof newPassword !== "string" || newPassword.length === 0) {
    return "Le nouveau mot de passe est requis";
  }
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères`;
  }
  if (typeof currentPassword === "string" && newPassword === currentPassword) {
    return "Le nouveau mot de passe doit être différent du mot de passe actuel";
  }
  return null;
}
