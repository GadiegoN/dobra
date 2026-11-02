import { Season } from "@/types/game";
import { getDb, ensureDatabaseSchema } from "./db";

/**
 * Obtém a data/hora atual no Horário de Brasília (America/Sao_Paulo, UTC-3).
 */
export function getBrasiliaDate(d: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });
  const parts = formatter.formatToParts(d);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value || "0", 10);

  return new Date(
    Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"))
  );
}

/**
 * Calcula a temporada semanal corrente no Horário de Brasília (segunda 00:00 BRT a domingo 23:59:59 BRT).
 */
export function getCurrentSeason(d: Date = new Date()): Season {
  const brDate = getBrasiliaDate(d);

  // Dia da semana no Brasil: 0 (Domingo) a 6 (Sábado)
  const dayOfWeek = brDate.getUTCDay();
  const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek; // Segunda = 1 ... Domingo = 7

  // Segunda-feira desta semana às 00:00 BRT
  const mondayDate = new Date(brDate);
  mondayDate.setUTCDate(brDate.getUTCDate() - (isoDay - 1));
  mondayDate.setUTCHours(0, 0, 0, 0);

  // Domingo desta semana às 23:59:59.999 BRT
  const sundayDate = new Date(mondayDate);
  sundayDate.setUTCDate(mondayDate.getUTCDate() + 6);
  sundayDate.setUTCHours(23, 59, 59, 999);

  // Cálculo da semana ISO
  const target = new Date(mondayDate);
  target.setUTCDate(target.getUTCDate() + 3); // Quinta-feira da semana
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  const year = target.getUTCFullYear();

  // Conversão para UTC (Brasília é UTC-3):
  // Segunda 00:00 BRT = Segunda 03:00 UTC
  // Domingo 23:59:59.999 BRT = Segunda 02:59:59.999 UTC
  const startsAtUTC = new Date(
    Date.UTC(
      mondayDate.getUTCFullYear(),
      mondayDate.getUTCMonth(),
      mondayDate.getUTCDate(),
      3,
      0,
      0,
      0
    )
  );
  const endsAtUTC = new Date(
    Date.UTC(
      sundayDate.getUTCFullYear(),
      sundayDate.getUTCMonth(),
      sundayDate.getUTCDate() + 1,
      2,
      59,
      59,
      999
    )
  );

  const seasonId = `season-${year}-w${weekNo.toString().padStart(2, "0")}`;

  return {
    id: seasonId,
    name: `Temporada #${weekNo} • ${year}`,
    startsAt: startsAtUTC.toISOString(),
    endsAt: endsAtUTC.toISOString(),
    isActive: true,
  };
}

export async function ensureSeasonExists(season: Season) {
  const sql = getDb();
  await ensureDatabaseSchema();

  await sql`
    INSERT INTO seasons (id, name, starts_at, ends_at, is_active)
    VALUES (${season.id}, ${season.name}, ${season.startsAt}::timestamptz, ${season.endsAt}::timestamptz, ${season.isActive})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      starts_at = EXCLUDED.starts_at,
      ends_at = EXCLUDED.ends_at,
      is_active = EXCLUDED.is_active;
  `;
}
