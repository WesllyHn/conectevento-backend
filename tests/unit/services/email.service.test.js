const emailService = require('../../../src/services/email.service');
const nodemailer = require('nodemailer');

jest.mock('nodemailer');

describe('EmailService', () => {
  let originalEnv;

  beforeEach(() => {
    jest.clearAllMocks();
    originalEnv = { ...process.env };
    emailService.transporter = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBrazilianDateTime', () => {
    test('deve retornar data formatada em português brasileiro', () => {
      const result = emailService.getBrazilianDateTime();
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    test('deve ajustar para UTC-3', () => {
      const result = emailService.getBrazilianDateTime();
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });
  });

  describe('initializeTransporter', () => {
    test('deve criar transporter quando credenciais estão configuradas', () => {
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      
      const mockTransporter = {
        sendMail: jest.fn()
      };
      nodemailer.createTransport.mockReturnValue(mockTransporter);

      emailService.initializeTransporter();

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'password123'
        }
      });
      expect(emailService.transporter).toBe(mockTransporter);
    });

    test('não deve criar transporter quando SMTP_USER não está configurado', () => {
      delete process.env.SMTP_USER;
      process.env.SMTP_PASSWORD = 'password123';

      emailService.initializeTransporter();

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(emailService.transporter).toBeNull();
    });

    test('não deve criar transporter quando SMTP_PASSWORD não está configurado', () => {
      process.env.SMTP_USER = 'test@test.com';
      delete process.env.SMTP_PASSWORD;

      emailService.initializeTransporter();

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(emailService.transporter).toBeNull();
    });

    test('não deve criar transporter quando nenhuma credencial está configurada', () => {
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASSWORD;

      emailService.initializeTransporter();

      expect(nodemailer.createTransport).not.toHaveBeenCalled();
      expect(emailService.transporter).toBeNull();
    });
  });

  describe('sendPasswordResetEmail', () => {
    beforeEach(() => {
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      process.env.SMTP_FROM = 'Test <test@test.com>';
    });

    test('deve enviar email quando transporter está configurado', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@test.com');
      expect(mailOptions.subject).toBe('Recuperação de Senha - ConectEvento');
      expect(mailOptions.from).toBe('Test <test@test.com>');
      expect(mailOptions.html).toContain('token123');
      expect(mailOptions.html).toContain('https://conectevento.online/reset-password?token=token123');
      expect(mailOptions.text).toContain('token123');
    });

    test('deve usar SMTP_FROM padrão quando não configurado', async () => {
      delete process.env.SMTP_FROM;
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('ConectEvento <noreply@conectevento.com>');
    });

    test('deve usar PASSWORD_RESET_TOKEN_EXPIRY do ambiente', async () => {
      process.env.PASSWORD_RESET_TOKEN_EXPIRY = '2';
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('2 horas');
      expect(mailOptions.text).toContain('2 horas');
    });

    test('deve usar valor padrão de 1 hora quando PASSWORD_RESET_TOKEN_EXPIRY não está configurado', async () => {
      delete process.env.PASSWORD_RESET_TOKEN_EXPIRY;
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('1 hora');
      expect(mailOptions.text).toContain('1 hora');
    });

    test('não deve enviar email quando transporter não está configurado', async () => {
      emailService.transporter = null;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User');

      expect(console.warn).toHaveBeenCalled();
    });

    test('deve incluir nome do usuário no email quando fornecido', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', 'João Silva');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('Olá, João Silva');
      expect(mailOptions.text).toContain('Olá, João Silva');
    });

    test('deve funcionar sem nome do usuário', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetEmail('user@test.com', 'token123', null);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('Olá');
      expect(mailOptions.html).not.toContain('Olá, Test User');
    });

    test('deve lançar erro quando envio falha', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error'))
      };
      emailService.transporter = mockTransporter;

      await expect(
        emailService.sendPasswordResetEmail('user@test.com', 'token123', 'Test User')
      ).rejects.toThrow('SMTP Error');
    });
  });

  describe('sendPasswordResetConfirmationEmail', () => {
    beforeEach(() => {
      process.env.SMTP_USER = 'test@test.com';
      process.env.SMTP_PASSWORD = 'password123';
      process.env.SMTP_FROM = 'Test <test@test.com>';
    });

    test('deve enviar email de confirmação quando transporter está configurado', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetConfirmationEmail('user@test.com', 'Test User');

      expect(mockTransporter.sendMail).toHaveBeenCalled();
      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.to).toBe('user@test.com');
      expect(mailOptions.subject).toBe('Senha Redefinida com Sucesso - ConectEvento');
      expect(mailOptions.from).toBe('Test <test@test.com>');
      expect(mailOptions.html).toContain('Sua senha foi redefinida com sucesso');
      expect(mailOptions.text).toContain('Sua senha foi redefinida com sucesso');
    });

    test('deve usar SMTP_FROM padrão quando não configurado', async () => {
      delete process.env.SMTP_FROM;
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetConfirmationEmail('user@test.com', 'Test User');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.from).toBe('ConectEvento <noreply@conectevento.com>');
    });

    test('não deve enviar email quando transporter não está configurado', async () => {
      emailService.transporter = null;

      await emailService.sendPasswordResetConfirmationEmail('user@test.com', 'Test User');

      expect(console.warn).toHaveBeenCalled();
    });

    test('deve incluir nome do usuário no email quando fornecido', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetConfirmationEmail('user@test.com', 'Maria Silva');

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('Olá, Maria Silva');
      expect(mailOptions.text).toContain('Olá, Maria Silva');
    });

    test('deve funcionar sem nome do usuário', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' })
      };
      emailService.transporter = mockTransporter;

      await emailService.sendPasswordResetConfirmationEmail('user@test.com', null);

      const mailOptions = mockTransporter.sendMail.mock.calls[0][0];
      expect(mailOptions.html).toContain('Olá');
      expect(mailOptions.html).not.toContain('Olá, Test User');
    });

    test('não deve lançar erro quando envio falha (senha já foi alterada)', async () => {
      const mockTransporter = {
        sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error'))
      };
      emailService.transporter = mockTransporter;

      await expect(
        emailService.sendPasswordResetConfirmationEmail('user@test.com', 'Test User')
      ).resolves.not.toThrow();
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});

