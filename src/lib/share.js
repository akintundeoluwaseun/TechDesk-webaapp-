// Sending a receipt to the customer who is standing there.
//
// Two buttons, because WhatsApp allows exactly one of the two things a shop
// wants and not the other. A wa.me link can open a chat with a specific
// number and prefill text, but it CANNOT attach a file -- no link can. The
// system share sheet can hand over the real PDF, but it cannot choose the
// recipient. So: WhatsApp for "send it to this number now", Share PDF for
// "give them the actual document".

import { money as formatMoney } from "./currency";

const DEFAULT_COUNTRY = "234"; // Nigeria

/**
 * A number in the form wa.me needs: country code, digits only, no plus.
 *
 * The shop types what is written on the customer's phone -- "08012345678".
 * Handing that to wa.me verbatim opens a chat with nobody, silently, which is
 * what the old repair button did. The leading zero is a domestic prefix and
 * has to become the country code instead.
 *
 * Returns "" when there is nothing usable, so callers can disable the button
 * rather than open a broken chat.
 */
export function waNumber(raw, country = DEFAULT_COUNTRY) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";

  // Already international, either as 234... or 00234...
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith(country)) return digits;

  // Domestic: 0 + 10 digits.
  if (digits.startsWith("0")) {
    const rest = digits.slice(1);
    return rest.length >= 9 ? country + rest : "";
  }

  // Bare local number with the trunk zero left off.
  if (digits.length === 10) return country + digits;

  // Anything else is either already another country's number or too short to
  // guess at. Passing it through beats mangling a foreign number.
  return digits.length >= 11 ? digits : "";
}

function money(n, settings) {
  return formatMoney(n, settings);
}

/**
 * Fills the shop's own template, when they have written one.
 *
 * Placeholders are the plain words a shopkeeper would expect, not a syntax
 * they have to learn: {name} {shop} {invoice} {ticket} {total} {device}.
 */
function applyTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (whole, key) => {
    const value = values[key];
    return value === undefined || value === null || value === "" ? whole : String(value);
  });
}

export function saleMessage(sale, settings = {}) {
  const shop = settings.shopName || "TechDesk";
  const values = {
    name: sale.customerName || "",
    shop,
    invoice: sale.invoice || "",
    total: money(sale.total, settings),
  };

  if (settings.whatsappTemplate?.trim()) {
    return applyTemplate(settings.whatsappTemplate.trim(), values);
  }

  const lines = [
    sale.customerName ? `Hello ${sale.customerName},` : "Hello,",
    "",
    `Thank you for your purchase at ${shop}.`,
    sale.invoice ? `Receipt: ${sale.invoice}` : null,
  ];

  (sale.items || []).forEach((item) => {
    lines.push(`- ${item.name} x${item.qty}  ${money(item.price * item.qty, settings)}`);
  });

  lines.push(`Total: ${money(sale.total, settings)}`);
  if (settings.receiptFooter) lines.push("", settings.receiptFooter);
  return lines.filter((l) => l !== null).join("\n");
}

export function repairMessage(repair, settings = {}) {
  const shop = settings.shopName || "TechDesk";
  const partsTotal = (repair.parts || []).reduce(
    (sum, part) => sum + Number(part.qty || 0) * Number(part.price || 0),
    0
  );
  const total = Number(repair.repairCost || 0) + partsTotal;

  const values = {
    name: repair.customerName || "",
    shop,
    ticket: repair.ticket || "",
    device: repair.device || "",
    total: money(total, settings),
  };

  if (settings.whatsappTemplate?.trim()) {
    return applyTemplate(settings.whatsappTemplate.trim(), values);
  }

  const lines = [
    repair.customerName ? `Hello ${repair.customerName},` : "Hello,",
    "",
    `Update on your repair at ${shop}.`,
    repair.ticket ? `Ticket: ${repair.ticket}` : null,
    repair.device ? `Item: ${repair.device}` : null,
    repair.problem ? `Issue: ${repair.problem}` : null,
    `Status: ${repair.status || "received"}`,
  ];

  (repair.parts || []).forEach((part) => {
    lines.push(`- ${part.name} x${part.qty}  ${money(part.price * part.qty, settings)}`);
  });

  if (total) lines.push(`Total: ${money(total, settings)}`);
  if (settings.receiptFooter) lines.push("", settings.receiptFooter);
  return lines.filter((l) => l !== null).join("\n");
}

/**
 * Opens WhatsApp on the customer's number with the message ready to send.
 *
 * Deliberately stops short of sending. Nothing can send on the shop's behalf
 * without WhatsApp Business API approval, and a button that claims to would
 * be lying -- they tap, read it, and press send themselves.
 */
export function openWhatsApp(phone, message, country = DEFAULT_COUNTRY) {
  const number = waNumber(phone, country);
  const text = encodeURIComponent(message);
  // Without a number wa.me still opens, on the contact picker -- better than
  // refusing outright when the sale was a walk-in with no phone on file.
  const url = number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener");
  return { ok: true, number };
}
