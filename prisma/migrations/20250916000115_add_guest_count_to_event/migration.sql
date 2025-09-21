/*
  Warnings:

  - You are about to drop the column `guesCount` on the `events` table. All the data in the column will be lost.
  - Added the required column `guestCount` to the `events` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."events" DROP COLUMN "guesCount",
ADD COLUMN     "guestCount" INTEGER NOT NULL;
