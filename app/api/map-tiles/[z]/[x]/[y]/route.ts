const TILE_HEADERS = {
  "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  "Content-Type": "image/png",
  "X-Content-Type-Options": "nosniff",
};

function tileNumber(value: string) {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> },
) {
  const raw = await params;
  const z = tileNumber(raw.z);
  const x = tileNumber(raw.x);
  const y = tileNumber(raw.y);
  const maxCoordinate = Number.isInteger(z) && z >= 0 && z <= 19 ? 2 ** z : 0;

  if (
    !Number.isInteger(x) || !Number.isInteger(y) ||
    x < 0 || y < 0 || x >= maxCoordinate || y >= maxCoordinate
  ) {
    return new Response("Invalid map tile", { status: 400 });
  }

  const sources = [
    `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    `https://a.basemaps.cartocdn.com/light_all/${z}/${x}/${y}.png`,
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source, {
        headers: {
          Accept: "image/png,image/*;q=0.8",
          "User-Agent": "BRU-Fondue/1.0 (https://bru-fondue.onrender.com)",
        },
        next: { revalidate: 604800 },
      });
      if (!response.ok) continue;
      return new Response(await response.arrayBuffer(), { headers: TILE_HEADERS });
    } catch {
      // Try the fallback provider when the primary tile server is unavailable.
    }
  }

  return new Response("Map tile unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store" },
  });
}
