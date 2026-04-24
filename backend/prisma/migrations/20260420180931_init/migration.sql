Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BindingFormat" AS ENUM ('CARTONE', 'TAPA_BLANDA', 'BOLSILLO', 'OMNIBUS', 'HARDCOVER', 'DIGITAL', 'OTHER');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('IN_COLLECTION', 'WISHLIST', 'LOANED');

-- CreateEnum
CREATE TYPE "ReadStatus" AS ENUM ('READ', 'READING', 'TO_READ');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('FOR_SALE', 'TO_SELL', 'SOLD');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_id" TEXT,
    "avatar_url" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comics" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "issue_number" TEXT,
    "publisher" TEXT,
    "year" INTEGER,
    "synopsis" TEXT,
    "cover_url" TEXT,
    "isbn" TEXT NOT NULL,
    "binding" "BindingFormat",
    "drawing_style" TEXT,
    "authors" TEXT,
    "scriptwriter" TEXT,
    "artist" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_comics" (
    "id" TEXT NOT NULL,
    "collection_status" "CollectionStatus",
    "read_status" "ReadStatus",
    "sale_status" "SaleStatus",
    "loaned_to" TEXT,
    "rating" INTEGER,
    "notes" TEXT,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "series_position" INTEGER,
    "collection_series_id" TEXT,
    "title_override" TEXT,
    "issue_number_override" TEXT,
    "publisher_override" TEXT,
    "year_override" INTEGER,
    "synopsis_override" TEXT,
    "cover_url_override" TEXT,
    "binding_override" "BindingFormat",
    "drawing_style_override" TEXT,
    "authors_override" TEXT,
    "scriptwriter_override" TEXT,
    "artist_override" TEXT,
    "user_id" TEXT NOT NULL,
    "comic_id" TEXT NOT NULL,

    CONSTRAINT "user_comics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "rating" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "total_volumes" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collection_id" TEXT NOT NULL,

    CONSTRAINT "collection_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comic_tags" (
    "comic_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,

    CONSTRAINT "comic_tags_pkey" PRIMARY KEY ("comic_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "comics_isbn_key" ON "comics"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "user_comics_user_id_comic_id_key" ON "user_comics"("user_id", "comic_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- AddForeignKey
ALTER TABLE "user_comics" ADD CONSTRAINT "user_comics_collection_series_id_fkey" FOREIGN KEY ("collection_series_id") REFERENCES "collection_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comics" ADD CONSTRAINT "user_comics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_comics" ADD CONSTRAINT "user_comics_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_series" ADD CONSTRAINT "collection_series_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_tags" ADD CONSTRAINT "comic_tags_comic_id_fkey" FOREIGN KEY ("comic_id") REFERENCES "comics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comic_tags" ADD CONSTRAINT "comic_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

