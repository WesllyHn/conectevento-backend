const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');

const prisma = new PrismaClient();

class ReviewService {

  async getReview(id, filters = {}) {
    try {
      const { type, page = 1, limit = 10 } = filters;

      const where = {};

      if (type === 'ORGANIZER') {
        where.organizerId = id
      } else {
        where.supplierId = id
      }

      const skip = (page - 1) * limit;
      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            event: true,
            supplier: true,
            organizer: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number.parseInt(limit)
        }),
        prisma.review.count({ where })
      ]);

      return {
        reviews,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError(`Error fetching reviews: ${error.message}`, 500);
    }
  }

  async getAvaliable(id) {
    try {
      const organizador = await prisma.user.findUnique({
        where: { id },
        select: { id: true, type: true }
      });

      if (!organizador) {
        throw new AppError('Organizador não encontrado', 404);
      }

      if (organizador.type !== 'ORGANIZER') {
        throw new AppError('Usuário não é um organizador', 403);
      }
      const eventos = await prisma.event.findMany({
        where: {
          organizerId: id,
          status: 'COMPLETED',
        },
        include: {
          roadmaps: {
            where: {
              supplierId: { not: null },
            },
            include: {
              supplier: true
            }
          },
          reviews: {
            where: {
              organizerId: id
            }
          }
        }
      });

      if (!eventos || eventos.length === 0) {
        return {fornecedores: []};
      }

      const fornecedoresParaAvaliar = [];

      eventos.forEach(evento => {
        evento.roadmaps.forEach(roadmap => {
          if (roadmap.supplierId) {
            const jaAvaliado = evento.reviews.some(
              review => review.supplierId === roadmap.supplierId && 
                       review.organizerId === id && 
                       review.eventId === evento.id
            );

            if (!jaAvaliado) {
              fornecedoresParaAvaliar.push({
                eventoId: evento.id,
                eventoTitulo: evento.title,
                eventoData: evento.date,
                fornecedorId: roadmap.supplierId,
                fornecedorNome: roadmap.supplier.name,
                fornecedorAvatar: roadmap.supplier.avatar,
                servicoPrestado: roadmap.category,
                descricaoServico: roadmap.description,
              });
            }
          }
        });
      });

      if (fornecedoresParaAvaliar.length === 0) {
         return {fornecedores: []};
      }

      return { 
        fornecedores: fornecedoresParaAvaliar, 
        total: fornecedoresParaAvaliar.length,
        status: 200 
      };

    } catch (error) {
      throw new AppError(`Error fetching reviews: ${error.message}`, 500);
    }
  }

  async updateSupplierRating(supplierId) {
    try {
      const reviews = await prisma.review.findMany({
        where: { supplierId },
        select: { rating: true }
      });

      const reviewCount = reviews.length;
      const averageRating = reviewCount > 0 
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount 
        : 0;

      await prisma.user.update({
        where: { id: supplierId },
        data: {
          rating: Math.round(averageRating * 10) / 10,
          reviewCount: reviewCount
        }
      });

      return { rating: averageRating, reviewCount };
    } catch (error) {
      console.error('Error updating supplier rating:', error);
      throw new AppError(`Error updating supplier rating: ${error.message}`, 500);
    }
  }

  async create(body) {
    try {
      const review = await prisma.review.create({
        data: body,
      });

      await this.updateSupplierRating(body.supplierId);

      return review;
    } catch (error) {
      if (error.code === 'P2003') {
        throw new AppError('Organizer not found', 404);
      }
      throw new AppError(`Error creating review: ${error.message}`, 400);
    }
  }

  async update(id, body) {
    try {
      const existe = await prisma.review.findUnique({ where: { id } });
      if (!existe) {
        throw new AppError('Review not found', 404);
      }

      const update = await prisma.review.update({
        where: { id },
        data: body
      });

      if (body.rating !== undefined) {
        await this.updateSupplierRating(existe.supplierId);
      }

      return update;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 'P2003') {
        throw new AppError('Organizer not found', 404);
      }
      throw new AppError(`Error updating review: ${error.message}`, 400);
    }
  }

  async delete(id) {
    try {
      const existe = await prisma.review.findUnique({ where: { id } });
      if (!existe) {
        throw new AppError('Review not found', 404);
      }

      const deleted = await prisma.review.delete({
        where: { id }
      });

      await this.updateSupplierRating(existe.supplierId);

      return deleted;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting review: ${error.message}`, 400);
    }
  }
}

module.exports = new ReviewService();