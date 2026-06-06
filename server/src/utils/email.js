import nodemailer from "nodemailer";
import { config } from "../config/index.js";

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!config.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, html, attachments }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email mock] To: ${to} | Subject: ${subject}`);
    return { mocked: true };
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, html, attachments });
  return { sent: true };
}

export async function sendRfqInvitation(to, rfq, vendorName) {
  const subject = `RFQ Invitation: ${rfq.title}`;
  const html = `
    <h2>New RFQ Invitation</h2>
    <p>Hello ${vendorName},</p>
    <p>You have been invited to submit a quotation for:</p>
    <p><strong>${rfq.title}</strong></p>
    <p>Deadline: ${new Date(rfq.deadline).toLocaleDateString("en-IN")}</p>
    <p>Please log in to VendorBridge to submit your quotation.</p>
  `;
  return sendMail({ to, subject, html });
}

export async function sendPoNotification(to, po, vendorName) {
  const subject = `Purchase Order ${po.po_number} Issued`;
  const html = `
    <h2>Purchase Order Issued</h2>
    <p>Hello ${vendorName},</p>
    <p>A new purchase order has been issued to your company.</p>
    <p><strong>PO Number:</strong> ${po.po_number}</p>
    <p><strong>Total Amount:</strong> ₹${Number(po.total_amount).toFixed(2)}</p>
    <p>Please log in to VendorBridge to view details.</p>
  `;
  return sendMail({ to, subject, html });
}

export async function sendInvoiceEmail(to, invoice, pdfBuffer) {
  const subject = `Invoice ${invoice.invoice_number} from VendorBridge`;
  const html = `
    <h2>Invoice ${invoice.invoice_number}</h2>
    <p>Please find attached your invoice from VendorBridge ERP.</p>
    <p><strong>Total Amount:</strong> ₹${Number(invoice.total_amount).toFixed(2)}</p>
    <p>Thank you for your business.</p>
  `;
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Email mock] To: ${to} | Subject: ${subject} | PDF size: ${pdfBuffer.length} bytes`);
    return { mocked: true };
  }
  return sendMail({
    to,
    subject,
    html,
    attachments: [{ filename: `${invoice.invoice_number}.pdf`, content: pdfBuffer, contentType: "application/pdf" }],
  });
}
