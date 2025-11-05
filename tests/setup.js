// tests/setup.js
// Configuração global do Jest
jest.setTimeout(10000);

// Configurar variáveis de ambiente ANTES de importar qualquer módulo
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.JWT_SECRET = 'test-secret-key';
process.env.PORT = '3001'; // Porta diferente para testes

// Mock global do Prisma Client para evitar conexões reais ao banco
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    event: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    quoteRequest: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    review: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    roadmap: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    supplierService: {
      findMany: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(), // ✅ ADICIONE ESTA LINHA
      deleteMany: jest.fn(),
    },
    portfolio: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      createMany: jest.fn(), // ✅ ADICIONE ESTA LINHA
      delete: jest.fn(),
      deleteMany: jest.fn(), // opcional, mas bom incluir também
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback(mockPrismaClient)),
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Suprimir logs de console durante testes (opcional)
global.console = {
  ...console,
  log: jest.fn(), // Mock console.log
  error: jest.fn(), // Mock console.error
  warn: jest.fn(), // Mock console.warn
  info: jest.fn(), // Mock console.info
  debug: jest.fn(), // Mock console.debug
};

// Limpeza após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

// Limpeza após todos os testes
afterAll(async () => {
  // Aguardar um pouco para garantir que todas as conexões foram fechadas
  await new Promise(resolve => setTimeout(resolve, 500));
});