const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// CORS
app.use(cors({
  origin: ['https://lpd.assessoria30.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Preflight
app.options('*', cors());

// JSON gran per al PDF
app.use(express.json({ limit: '15mb' }));

// Test
app.get('/', (req, res) => {
  res.send('LPD API operativa');
});

// Endpoint principal
app.post('/send-pdf', async (req, res) => {
  try {
    const {
      nombre,
      email_client,
      telefono,
      pdf_base64,
      pdf_filename
    } = req.body;

    if (!pdf_base64 || !pdf_filename) {
      return res.status(400).json({
        success: false,
        error: 'Falten pdf_base64 o pdf_filename'
      });
    }

    // Logs per comprovar variables
    console.log('SMTP USER:', process.env.SMTP_USER);
    console.log('SMTP PASS:', process.env.SMTP_PASS ? 'OK' : 'NO DEFINIDA');

    const cleanBase64 = pdf_base64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ionos.es',
      port: Number(process.env.SMTP_PORT || 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    // Email a tu
    await transporter.sendMail({
      from: `"Assessoria 3.0 LPD" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: `Nou RGPD signat - ${nombre || 'Client'}`,
      text: `Client: ${nombre || ''}\nEmail: ${email_client || ''}\nTelèfon: ${telefono || ''}`,
      attachments: [
        {
          filename: pdf_filename,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    // Email al client
    if (email_client) {
      await transporter.sendMail({
        from: `"Assessoria 3.0" <${process.env.SMTP_USER}>`,
        to: email_client,
        subject: 'Còpia document RGPD signat',
        text: `Hola ${nombre || ''},

T’adjuntem còpia del document RGPD signat.

Assessoria 3.0`,
        attachments: [
          {
            filename: pdf_filename,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('❌ ERROR SMTP:', error.message);
    console.error(error);

    res.status(500).json({
      success: false,
      error: 'Error enviant email'
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor actiu al port ${PORT}`);
});
