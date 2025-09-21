-- CreateEnum
CREATE TYPE "public"."UserType" AS ENUM ('ORGANIZER', 'SUPPLIER');

-- CreateEnum
CREATE TYPE "public"."PriceRange" AS ENUM ('BUDGET', 'MID', 'PREMIUM');

-- CreateEnum
CREATE TYPE "public"."EventType" AS ENUM ('WEDDING', 'BIRTHDAY', 'CORPORATE', 'GRADUATION', 'BAPTISM', 'BABY_SHOWER', 'BRIDAL_SHOWER', 'ENGAGEMENT', 'KIDS_PARTY', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."QuoteStatus" AS ENUM ('PENDING', 'RESPONDED', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "type" "public"."UserType" NOT NULL,
    "avatar" TEXT,
    "companyName" TEXT,
    "cnpjOrCpf" TEXT,
    "description" TEXT,
    "location" TEXT,
    "priceRange" "public"."PriceRange",
    "rating" DOUBLE PRECISION DEFAULT 0,
    "reviewCount" INTEGER DEFAULT 0,
    "availability" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."supplier_services" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "service" TEXT NOT NULL,

    CONSTRAINT "supplier_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."portfolio" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,

    CONSTRAINT "portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."events" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "public"."EventType" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "budget" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'PLANNING',
    "organizerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quote_requests" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "public"."QuoteStatus" NOT NULL DEFAULT 'PENDING',
    "response" TEXT,
    "price" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."reviews" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" TEXT NOT NULL,
    "response" TEXT,
    "responseDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- AddForeignKey
ALTER TABLE "public"."supplier_services" ADD CONSTRAINT "supplier_services_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."portfolio" ADD CONSTRAINT "portfolio_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."events" ADD CONSTRAINT "events_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_requests" ADD CONSTRAINT "quote_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_requests" ADD CONSTRAINT "quote_requests_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quote_requests" ADD CONSTRAINT "quote_requests_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."reviews" ADD CONSTRAINT "reviews_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
