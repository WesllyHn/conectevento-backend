const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');

const prisma = new PrismaClient();

class RoadmapService {

    async getRoadmap(id) {
        try {
            const data = await prisma.roadmap.findUnique({
                    where: { id }
                })

            return data
        } catch (error) {
            throw new AppError(`Error fetching roadmap: ${error.message}`, 500);
        }
    }
    async get(id, filters = {}) {
        try {
            const { type, page = 1, limit = 10 } = filters;

            const where = {idEvent: id};

            const skip = (page - 1) * limit;

            const response = await prisma.roadmap.findMany({
                    where,
                    orderBy: { createdAt: 'desc' },
                })

            return response;
        } catch (error) {
            throw new AppError(`Error fetching roadmap: ${error.message}`, 500);
        }
    }

    async create(body) {
        try {
            const create = await prisma.roadmap.create({
                data: body,
            });

            return create;
        } catch (error) {
            if (error.code === 'P2003') {
                throw new AppError('Organizer not found', 404);
            }
            throw new AppError(`Error creating roadmap: ${error.message}`, 400);
        }
    }
    async create(body) {
        try {
            const create = await prisma.roadmap.create({
                data: body,
            });

            return create;
        } catch (error) {
            if (error.code === 'P2003') {
                throw new AppError('Organizer not found', 404);
            }
            throw new AppError(`Error creating roadmap: ${error.message}`, 400);
        }
    }
    async createRoadmapEsp(idEvent, supplierId, companyName, price, category) {
        try {
            const bodyCreate = {
                idEvent,
                supplierId,
                title: companyName,
                description: "Orçamento aceito!",
                price,
                status: "Contratado",
                category
            }
            const create = await prisma.roadmap.create({
                data: bodyCreate,
            });

            return create;
        } catch (error) {
            throw new AppError(`Error creating roadmap: ${error.message}`, 400);
        }
    }

    async update(id, body) {
        try {
            const existe = await prisma.roadmap.findUnique({ where: { id } });
            if (!existe) {
                throw new AppError('Event not found', 404);
            }


            const update = await prisma.roadmap.update({
                where: {
                    id
                },
                data: body
            })

            return update
        } catch (error) {
            if (error instanceof AppError) throw error;
            if (error.code === 'P2003') {
                throw new AppError('Organizer not found', 404);
            }
            throw new AppError(`Error updating roadmap: ${error.message}`, 400);
        }
    }

    async delete(id) {
        try {
            const existe = await prisma.roadmap.findUnique({ where: { id } });
            if (!existe) {
                throw new AppError('Event not found', 404);
            }

            const ghost = await prisma.roadmap.delete({
                where: { id }
            });

            return ghost;
        } catch (error) {
            if (error instanceof AppError) throw error;
            throw new AppError(`Error deleting roadmap: ${error.message}`, 400);
        }
    }

}

module.exports = new RoadmapService();