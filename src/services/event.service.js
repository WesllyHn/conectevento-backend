const { PrismaClient } = require('@prisma/client');
const AppError = require('../utils/AppError');
const prisma = new PrismaClient();

class EventService {
  async getAllEvents(filters = {}) {
    try {
      const { type, status, organizerId, page = 1, limit = 10 } = filters;
      
      const where = {};
      
      if (type) where.type = type;
      if (status) where.status = status;
      if (organizerId) where.organizerId = organizerId;
      
      const skip = (page - 1) * limit;
      
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            organizer: {
              select: {
                id: true,
                name: true,
                email: true,
                companyName: true
              }
            },
            quoteRequests: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    companyName: true
                  }
                }
              }
            },
            reviews: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number.parseInt(limit)
        }),
        prisma.event.count({ where })
      ]);
      
      return {
        events,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError(`Error fetching events: ${error.message}`, 500);
    }
  }

  async getEventById(id) {
    try {
      const event = await prisma.event.findUnique({
        where: { id },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true,
              avatar: true
            }
          },
          quoteRequests: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  companyName: true,
                  avatar: true,
                  rating: true
                }
              }
            }
          },
          reviews: {
            include: {
              organizer: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            }
          }
        }
      });
      
      if (!event) {
        throw new AppError('Event not found', 404);
      }
      
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error fetching event: ${error.message}`, 500);
    }
  }

  async createEvent(eventData) {
    try {
      const event = await prisma.event.create({
        data: eventData,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true
            }
          }
        }
      });
      return event;
    } catch (error) {
      if (error.code === 'P2003') {
        throw new AppError('Organizer not found', 404);
      }
      throw new AppError(`Error creating event: ${error.message}`, 400);
    }
  }

  async updateEvent(id, eventData) {
    try {
      const existingEvent = await prisma.event.findUnique({ where: { id } });
      if (!existingEvent) {
        throw new AppError('Event not found', 404);
      }
      
      const event = await prisma.event.update({
        where: { id },
        data: eventData,
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true,
              companyName: true
            }
          },
          quoteRequests: {
            include: {
              supplier: {
                select: {
                  id: true,
                  name: true,
                  companyName: true
                }
              }
            }
          }
        }
      });
      
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error.code === 'P2003') {
        throw new AppError('Organizer not found', 404);
      }
      throw new AppError(`Error updating event: ${error.message}`, 400);
    }
  }

  async deleteEvent(id) {
    try {
      const existingEvent = await prisma.event.findUnique({ where: { id } });
      if (!existingEvent) {
        throw new AppError('Event not found', 404);
      }
      
      const event = await prisma.event.delete({
        where: { id }
      });
      
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error deleting event: ${error.message}`, 400);
    }
  }

  async updateEventStatus(id, status) {
    try {
      const existingEvent = await prisma.event.findUnique({ where: { id } });
      if (!existingEvent) {
        throw new AppError('Event not found', 404);
      }
      
      const validStatuses = ['PLANNING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        throw new AppError('Invalid status value', 400);
      }
      
      const event = await prisma.event.update({
        where: { id },
        data: { status },
        include: {
          organizer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      
      return event;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(`Error updating event status: ${error.message}`, 400);
    }
  }

  async getEventsByOrganizer(organizerId, filters = {}) {
    try {
      const { status, type, page = 1, limit = 10 } = filters;
      
      const where = { organizerId };
      
      if (status) where.status = status;
      if (type) where.type = type;
      
      const skip = (page - 1) * limit;
      
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            quoteRequests: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    companyName: true,
                    rating: true
                  }
                }
              }
            },
            reviews: true
          },
          orderBy: { date: 'asc' },
          skip,
          take: Number.parseInt(limit)
        }),
        prisma.event.count({ where })
      ]);
      
      return {
        events,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError(`Error fetching organizer events: ${error.message}`, 500);
    }
  }

  async getEventsByType(type, filters = {}) {
    try {
      const { status, page = 1, limit = 10 } = filters;
      
      const where = { type };
      
      if (status) where.status = status;
      
      const skip = (page - 1) * limit;
      
      const [events, total] = await Promise.all([
        prisma.event.findMany({
          where,
          include: {
            organizer: {
              select: {
                id: true,
                name: true,
                companyName: true
              }
            }
          },
          orderBy: { date: 'asc' },
          skip,
          take: Number.parseInt(limit)
        }),
        prisma.event.count({ where })
      ]);
      
      return {
        events,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError(`Error fetching events by type: ${error.message}`, 500);
    }
  }
}

module.exports = new EventService();