const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// ✅ CORS configurat correctament
app.use(cors({
  origin: ['https://lpd.assessoria30.com'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// ✅ IMPORTANT: permet preflight (arregla error CORS)
app.options('*', cors());

// ✅ Permet enviar PDFs grans
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
      email_empresa,
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

    // ✅ Netegem prefix si existeix
    const cleanBase64 = pdf_base64.replace(/^data:application\/pdf;base64,/, '');
    const pdfBuffer = Buffer.from(cleanBase64, 'base64');

    const transporter = nodemailer.createTransport({
      host: 'smtp.ionos.es',
      port: 465,
      secure: true,
      auth: {
        user: 'lopd@assessoria30.com',
        pass: 'Placas.22'
      }
    });

    // 📩 EMAIL A TU
    await transporter.sendMail({
      from: '"Assessoria 3.0 LPD" <lopd@assessoria30.com>',
      to: 'lopd@assessoria30.com',
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

    // 📩 EMAIL AL CLIENT (còpia)
    if (email_client) {
      await transporter.sendMail({
        from: '"Assessoria 3.0" <lopd@assessoria30.com>',
        to: email_client,
        subject: 'Còpia document RGPD signat',
        text: `Hola ${nombre || ''},\n\nT’adjuntem còpia del document RGPD signat.\n\nAssessoria 3.0`,
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
    console.error('❌ Error enviant email:', error);
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
