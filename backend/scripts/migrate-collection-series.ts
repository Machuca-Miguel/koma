/**
 * Migración: Comic.collectionSeriesId → UserComic.collectionSeriesId
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const comics = await prisma.comic.findMany({
    where: { collectionSeriesId: { not: null } },
    select: {
      id: true,
      collectionSeriesId: true,
      collectionSeries: { select: { collection: { select: { userId: true } } } },
    },
  });

  console.log(`Comics con collectionSeriesId: ${comics.length}`);
  let updated = 0;
  let skipped = 0;

  for (const comic of comics) {
    const ownerId = comic.collectionSeries?.collection?.userId;
    if (!ownerId || !comic.collectionSeriesId) { skipped++; continue; }

    const result = await prisma.userComic.updateMany({
      where: { comicId: comic.id, userId: ownerId },
      data: { collectionSeriesId: comic.collectionSeriesId },
    });

    if (result.count > 0) { updated++; } else { skipped++; }
  }

  console.log(`Migrados: ${updated} | Sin UserComic owner: ${skipped}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
