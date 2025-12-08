const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  getBrazilianDateTime() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const brazilianTime = new Date(utc + (-3 * 3600000));
    return brazilianTime.toLocaleString('pt-BR');
  }

  initializeTransporter() {
    const smtpConfig = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    };

    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.warn('⚠️  SMTP não configurado. Emails não serão enviados. Configure SMTP_USER e SMTP_PASSWORD no .env');
      return;
    }

    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendPasswordResetEmail(email, token, userName) {
    if (!this.transporter) {
      console.warn('⚠️  Email service não configurado. Token gerado:', token);
      return;
    }

    const frontendUrl = 'https://conectevento.online';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;
    const expiryHours = parseInt(process.env.PASSWORD_RESET_TOKEN_EXPIRY || '1');

    const mailOptions = {
      from: process.env.SMTP_FROM || 'ConectEvento <noreply@conectevento.com>',
      to: email,
      subject: 'Recuperação de Senha - ConectEvento',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4a90e2;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4a90e2;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin: 20px 0;
              font-weight: bold;
            }
            .button:hover {
              background-color: #357abd;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ConectEvento</h1>
            </div>
            <div class="content">
              <p>Olá${userName ? `, ${userName}` : ''},</p>
              
              <p>Você solicitou a recuperação de senha para sua conta no ConectEvento.</p>
              
              <p>Clique no botão abaixo para redefinir sua senha:</p>
              
              <div style="text-align: center;">
                <a href="${resetLink}" class="button">Redefinir Senha</a>
              </div>
              
              <p>Ou copie e cole o link abaixo no seu navegador:</p>
              <p style="word-break: break-all; color: #4a90e2;">${resetLink}</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <ul>
                  <li>Este link expira em ${expiryHours} ${expiryHours === 1 ? 'hora' : 'horas'}</li>
                  <li>Não compartilhe este link com ninguém</li>
                  <li>Se você não solicitou esta recuperação, ignore este email</li>
                </ul>
              </div>
              
              <p>Se você não solicitou esta recuperação, ignore este email ou entre em contato com o suporte.</p>
              
              <p>Por segurança, nunca compartilhe este link com ninguém.</p>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} ConectEvento. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá${userName ? `, ${userName}` : ''},

        Você solicitou a recuperação de senha para sua conta no ConectEvento.

        Clique no link abaixo para redefinir sua senha:
        ${resetLink}

        Este link expira em ${expiryHours} ${expiryHours === 1 ? 'hora' : 'horas'}.

        IMPORTANTE:
        - Não compartilhe este link com ninguém
        - Se você não solicitou esta recuperação, ignore este email

        Se você não solicitou esta recuperação, ignore este email ou entre em contato com o suporte.

        Por segurança, nunca compartilhe este link com ninguém.

        Atenciosamente,
        Equipe ConectEvento
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de recuperação de senha enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Erro ao enviar email de recuperação de senha:', error);
      throw error;
    }
  }

  async sendPasswordResetConfirmationEmail(email, userName) {
    if (!this.transporter) {
      console.warn('⚠️  Email service não configurado. Confirmação não enviada.');
      return;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'ConectEvento <noreply@conectevento.com>',
      to: email,
      subject: 'Senha Redefinida com Sucesso - ConectEvento',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background-color: #f9f9f9;
              border-radius: 8px;
              padding: 30px;
              border: 1px solid #e0e0e0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #4a90e2;
              margin: 0;
            }
            .content {
              background-color: white;
              padding: 25px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .success {
              background-color: #d4edda;
              border-left: 4px solid #28a745;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .warning {
              background-color: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #666;
              font-size: 12px;
              margin-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ConectEvento</h1>
            </div>
            <div class="content">
              <p>Olá${userName ? `, ${userName}` : ''},</p>
              
              <div class="success">
                <strong>✅ Sua senha foi redefinida com sucesso!</strong>
              </div>
              
              <p>Sua senha foi alterada em ${this.getBrazilianDateTime()}.</p>
              
              <div class="warning">
                <strong>⚠️ Importante:</strong>
                <p>Se você não realizou esta alteração, entre em contato com o suporte imediatamente.</p>
              </div>
              
              <p>Por segurança, recomendamos que você:</p>
              <ul>
                <li>Use uma senha forte e única</li>
                <li>Não compartilhe sua senha com ninguém</li>
                <li>Altere sua senha regularmente</li>
              </ul>
            </div>
            <div class="footer">
              <p>Este é um email automático, por favor não responda.</p>
              <p>&copy; ${new Date().getFullYear()} ConectEvento. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Olá${userName ? `, ${userName}` : ''},

        Sua senha foi redefinida com sucesso!

        Sua senha foi alterada em ${this.getBrazilianDateTime()}.

        IMPORTANTE:
        Se você não realizou esta alteração, entre em contato com o suporte imediatamente.

        Por segurança, recomendamos que você:
        - Use uma senha forte e única
        - Não compartilhe sua senha com ninguém
        - Altere sua senha regularmente

        Atenciosamente,
        Equipe ConectEvento
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de confirmação de redefinição de senha enviado:', info.messageId);
      return info;
    } catch (error) {
      console.error('❌ Erro ao enviar email de confirmação:', error);
      // Não lançar erro aqui, pois a senha já foi alterada
    }
  }
}

module.exports = new EmailService();

