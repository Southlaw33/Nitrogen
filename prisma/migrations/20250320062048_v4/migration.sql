/*
  Warnings:

  - You are about to alter the column `price` on the `MenuItems` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `DoublePrecision`.

*/
-- AlterTable
ALTER TABLE "MenuItems" ALTER COLUMN "price" SET DATA TYPE DOUBLE PRECISION;
