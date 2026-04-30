-- CreateTable
CREATE TABLE `rag_documents` (
    `id` VARCHAR(191) NOT NULL,
    `filename` VARCHAR(191) NULL,
    `rawText` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rag_chunks` (
    `id` VARCHAR(191) NOT NULL,
    `documentId` VARCHAR(191) NOT NULL,
    `chunkIndex` INTEGER NOT NULL,
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `embedding` JSON NOT NULL,

    INDEX `rag_chunks_documentId_idx`(`documentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rag_chunks` ADD CONSTRAINT `rag_chunks_documentId_fkey` FOREIGN KEY (`documentId`) REFERENCES `rag_documents`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

