export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const vastFeedUrl =
    'https://subtle-injury.com/d/mLF.zQdgGfNEvDZGGhUU/Gemme9/uFZjUolTkaPSTzcV2YMBjcYO0/MADJE/t/NFzvYRyGNqjuQAwYN-QR';

  const defaultMediaUrls = [
    'https://www.dismal-library.pro/152327/199275/530449_c6438y.mp4',
    'https://www.dismal-library.pro/152327/199275/559487_2f79fy.mp4',
    'https://www.dismal-library.pro/360312/974363/1329362_5d4bfy.mp4',
    'https://www.dismal-library.pro/152327/199275/559491_4e8bey.mp4',
    'https://www.dismal-library.pro/152327/199275/559485_3654ay.mp4',
  ];

  const defaultClickThrough = vastFeedUrl;

  try {
    const upstreamRes = await fetch(vastFeedUrl, {
      headers: {
        'User-Agent':
          (req.headers['user-agent'] as string) ||
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://cineai.vercel.app/',
      },
    });

    if (upstreamRes.ok) {
      const xml = await upstreamRes.text();
      const mediaFiles = [
        ...xml.matchAll(/<MediaFile[^>]*><!\[CDATA\[(.*?)\]\]><\/MediaFile>/gi),
      ]
        .map((m) => m[1]?.trim())
        .filter((u) => u && (u.endsWith('.mp4') || u.includes('.mp4') || u.includes('video')));

      const clickThrough =
        xml.match(/<ClickThrough><!\[CDATA\[(.*?)\]\]><\/ClickThrough>/i)?.[1]?.trim() ||
        defaultClickThrough;

      const impressions = [
        ...xml.matchAll(/<Impression><!\[CDATA\[(.*?)\]\]><\/Impression>/gi),
      ]
        .map((m) => m[1]?.trim())
        .filter((u): u is string => Boolean(u));

      if (mediaFiles.length > 0) {
        return res.status(200).json({
          success: true,
          videoUrl: mediaFiles[0],
          allVideoUrls: mediaFiles,
          clickThrough,
          impressions,
        });
      }
    }
  } catch (err: any) {
    console.warn('Vercel VAST fetch fallback:', err?.message);
  }

  return res.status(200).json({
    success: true,
    videoUrl: defaultMediaUrls[0],
    allVideoUrls: defaultMediaUrls,
    clickThrough: defaultClickThrough,
    impressions: [],
  });
}
