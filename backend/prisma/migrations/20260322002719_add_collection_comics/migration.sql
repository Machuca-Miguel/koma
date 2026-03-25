-- CreateTable
CREATE TABLE "collection_comics" (
    "collection_id" TEXT NOT NULL,
    "comic_id" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_comics_pkey" PRIMARY KEY ("collection_id","comic_id")
);

-- AddForeignKey
ALTER TABLE "collection_comics" ADD CONSTRAINT "collection_comics_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_comics" ADD CONSTRAINT "collection_comics_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;
