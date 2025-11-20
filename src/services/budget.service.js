const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');
const roadmapService = require('./roadmap.service');
const prisma = new PrismaClient();

class BudgetService {

    async getBudget(id, filters = {}) {
        try {
            const { type, page = 1, limit = 10 } = filters;

            const where = {};

            if (type === 'ORGANIZER') {
                where.organizerId = id
            } else {
                where.supplierId = id
            }


            const skip = (page - 1) * limit;

            const [response, total] = await Promise.all([
                prisma.quoteRequest.findMany({
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
                prisma.quoteRequest.count({ where })
            ]);

            return {
                response,
                pagination: {
                    page: Number.parseInt(page),
                    limit: Number.parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            throw new AppError(`Error fetching budget: ${error.message}`, 500);
        }
    }
    async budget(id) {
        try {
            const response = await prisma.quoteRequest.findMany({
                    where: {
                        OR: [
                            {supplierId: id},
                            {organizerId: id}
                        ]
                    },
                    include: {
                        event: true,
                        supplier: true,
                        organizer: true
                    },
                    orderBy: { createdAt: 'desc' },
                })

            return response;
        } catch (error) {
            throw new AppError(`Error fetching budget: ${error.message}`, 500);
        }
    }

    async create(body) {
        try {
            const create = await prisma.quoteRequest.create({
                data: body,
            });

            return create;
        } catch (error) {
            if (error.code === 'P2003') {
                throw new AppError('Organizer not found', 404);
            }
            throw new AppError(`Error creating budget: ${error.message}`, 400);
        }
    }

    async update(id, body) {
        try {
        const existe = await prisma.quoteRequest.findUnique({ 
            where: { id },
            include: {
                supplier: true,
                event: true
            }
        });
        
        if (!existe) {
            throw new AppError('Quote request not found', 404);
        }

        const update = await prisma.quoteRequest.update({
            where: { id },
            data: body,
            select: {
                status: true,
                eventId: true,
                supplierId: true,
                price: true,
                supplier: {
                    select: {
                        id: true,
                        companyName: true,
                        name: true
                    }
                },
                event: {
                    select: {
                        id: true,
                        title: true,
                        type: true
                    }
                }
            }
        });

        if (update.status === 'ACCEPTED' && update.price) {
            await roadmapService.createRoadmapEsp(
                update.eventId,
                update.supplierId,
                update.supplier.companyName || update.supplier.name,
                update.price,
                update.event.type
            );
        }

        return update;
    } catch (error) {
            if (error instanceof AppError) throw error;
            if (error.code === 'P2003') {
                throw new AppError('Organizer not found', 404);
            }
            throw new AppError(`Error updating budget: ${error.message}`, 400);
        }
    }

    async delete(id) {
        try {
            const existe = await prisma.quoteRequest.findUnique({ where: { id } });
            if (!existe) {
                throw new AppError('Event not found', 404);
            }

            const ghost = await prisma.quoteRequest.delete({
                where: { id }
            });

            return ghost;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Error deleting event: ${error.message}`, 400);
        }
    }

}

module.exports = new BudgetService();