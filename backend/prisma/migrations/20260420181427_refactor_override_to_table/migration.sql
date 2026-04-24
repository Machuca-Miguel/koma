-- CreateTable first so FK reference exists
CREATE TABLE "user_comic_overrides" (
    "id" TEXT NOT NULL,
    "user_comic_id" TEXT NOT NULL,
    "title" TEXT,
    "issue_number" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "synopsis" TEXT,
    "cover_url" TEXT,
    "binding" "BindingFormat",
    "drawing_style" TEXT,
    "authors" TEXT,
    "scriptwriter" TEXT,
    "artist" TEXT,

    CONSTRAINT "user_comic_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_comic_overrides_user_comic_id_key" ON "user_comic_overrides"("user_comic_id");

-- Migrate existing override data before dropping columns
INSERT INTO "user_comic_overrides" (
    "id", "user_comic_id",
    "title", "issue_number", "publisher", "year", "synopsis",
    "cover_url", "binding", "drawing_style", "authors", "scriptwriter", "artist"
)
SELECT
    gen_random_uuid()::text,
    "id",
    "title_override", "issue_number_override", "publisher_override", "year_override", "synopsis_override",
    "cover_url_override", "binding_override", "drawing_style_override", "authors_override", "scriptwriter_override", "artist_override"
FROM "user_comics"
WHERE
    "title_override"        IS NOT NULL OR
    "issue_number_override" IS NOT NULL OR
    "publisher_override"    IS NOT NULL OR
    "year_override"         IS NOT NULL OR
    "synopsis_override"     IS NOT NULL OR
    "cover_url_override"    IS NOT NULL OR
    "binding_override"      IS NOT NULL OR
    "drawing_style_override" IS NOT NULL OR
    "authors_override"      IS NOT NULL OR
    "scriptwriter_override" IS NOT NULL OR
    "artist_override"       IS NOT NULL;

-- AddForeignKey
ALTER TABLE "user_comic_overrides" ADD CONSTRAINT "user_comic_overrides_user_comic_id_fkey" FOREIGN KEY ("user_comic_id") REFERENCES "user_comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable: drop override columns now that data is migrated
ALTER TABLE "user_comics" DROP COLUMN "artist_override",
DROP COLUMN "authors_override",
DROP COLUMN "binding_override",
DROP COLUMN "cover_url_override",
DROP COLUMN "drawing_style_override",
DROP COLUMN "issue_number_override",
DROP COLUMN "publisher_override",
DROP COLUMN "scriptwriter_override",
DROP COLUMN "synopsis_override",
DROP COLUMN "title_override",
DROP COLUMN "year_override";
