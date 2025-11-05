/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `portfolio` table. All the data in the column will be lost.
  - Added the required column `fileName` to the `portfolio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fileSize` to the `portfolio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageData` to the `portfolio` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mimeType` to the `portfolio` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "portfolio" DROP COLUMN "imageUrl",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "fileName" TEXT NOT NULL,
ADD COLUMN     "fileSize" INTEGER NOT NULL,
ADD COLUMN     "imageData" BYTEA NOT NULL,
ADD COLUMN     "mimeType" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "roadmaps" (
    "idEvent" TEXT NOT NULL,
    "supplierId" TEXT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmaps" ADD CONSTRAINT "roadmaps_idEvent_fkey" FOREIGN KEY ("idEvent") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
