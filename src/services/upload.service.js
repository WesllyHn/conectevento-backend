const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.saveImage = async ({ supplierId, fileBuffer, mimeType, fileName, fileSize }) => {
  const dataBuffer = Buffer.isBuffer(fileBuffer) ? fileBuffer : Buffer.from(fileBuffer);

  const image = await prisma.portfolio.create({
    data: {
      supplierId,
      imageData: dataBuffer,
      mimeType,
      fileName,
      fileSize,
    },
  });

  return {
    id: image.id,
    fileName: image.fileName,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    createdAt: image.createdAt,
    url: `/api/upload/${image.id}`,
  };
};

exports.getImageById = async (id) => {
  return prisma.portfolio.findUnique({
    where: { id },
  });
};

exports.getImagesBySupplier = async (supplierId) => {
  const images = await prisma.portfolio.findMany({
    where: { supplierId },
    select: { id: true, fileName: true, mimeType: true, fileSize: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return images.map(img => ({
    ...img,
    url: `/api/upload/${img.id}`,
  }));
};

exports.deleteImage = async (id) => {
  try {
    const image = await prisma.portfolio.findUnique({
      where: { id },
    });

    if (!image) {
      return null;
    }

    await prisma.portfolio.delete({
      where: { id },
    });

    return true;
  } catch (error) {
    console.error('Erro ao deletar imagem do banco:', error);
    throw error;
  }
};