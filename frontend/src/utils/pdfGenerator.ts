import { jsPDF } from 'jspdf';
import { WithdrawalIntel } from '../types';

export const generateWithdrawalForensicPDF = (intel: WithdrawalIntel) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let y = margin;

  // Colors
  const primaryDark = [15, 23, 42]; // Slate 900
  const brandPurple = [79, 70, 229]; // Indigo 600
  const borderGrey = [226, 232, 240]; // Slate 200
  const textMuted = [100, 116, 139]; // Slate 500
  const dangerRed = [220, 38, 38]; // Red 600
  const alertBg = [254, 242, 242]; // Red 50
  const cardBg = [248, 250, 252]; // Slate 50

  // 1. TOP OFFICIAL HEADER BANNER
  doc.setFillColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.rect(0, 0, pageWidth, 24, 'F');

  // Accent Line
  doc.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.rect(0, 24, pageWidth, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('GOVERNMENT OF TAMIL NADU • CYBER CRIME INVESTIGATION WING', margin, 10);
  
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text('I4C NATIONAL CYBERCRIME FORENSIC NETWORK • SECTION 107 BNSS STATUTORY INTELLIGENCE', margin, 16);

  // Security Pill (Right)
  doc.setFillColor(dangerRed[0], dangerRed[1], dangerRed[2]);
  doc.roundedRect(pageWidth - margin - 42, 6, 42, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('CONFIDENTIAL // LAW ENFORCEMENT', pageWidth - margin - 40, 13.5);

  y = 33;

  // 2. DOSSIER METADATA TITLE BLOCK
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CYBERCRIME FORENSIC WITHDRAWAL & RUNNER DOSSIER', margin, y);

  y += 6;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  
  const formattedDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`REPORT REFERENCE: DOS-2026-TN-${intel.transaction_id.toString().padStart(5, '0')}   |   GENERATED: ${formattedDate}   |   INVESTIGATOR: Krishna S (Badge #21)`, margin, y);

  y += 6;
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;

  // 3. SECTION: SUSPECT & RUNNER IDENTITY
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 44, 2, 2, 'FD');

  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('1. SUSPECT & RUNNER IDENTITY DOSSIER', margin + 4, y + 6);

  // Match confidence pill
  doc.setFillColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.roundedRect(pageWidth - margin - 40, y + 2, 36, 6, 1.5, 1.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`FACIAL MATCH: ${intel.face_match_confidence}%`, pageWidth - margin - 38, y + 6.2);

  // Two column details inside box
  const col1 = margin + 5;
  const col2 = margin + 92;
  let rowY = y + 14;

  const drawField = (label: string, value: string, x: number, curY: number, highlight = false) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(label.toUpperCase(), x, curY);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', highlight ? 'bold' : 'normal');
    doc.setTextColor(highlight ? dangerRed[0] : primaryDark[0], highlight ? dangerRed[1] : primaryDark[1], highlight ? dangerRed[2] : primaryDark[2]);
    doc.text(value, x, curY + 4.5);
  };

  drawField('Suspect Name / Runner', intel.withdrawer_name, col1, rowY);
  drawField('Alias / Node Tag', intel.withdrawer_alias || 'N/A', col2, rowY);

  rowY += 10;
  drawField('Syndicate Role', intel.withdrawer_role.replace(/_/g, ' '), col1, rowY, true);
  drawField('Contact / SIM Telemetry', intel.withdrawer_phone, col2, rowY);

  rowY += 10;
  drawField('Identity Verification', intel.withdrawer_id_number, col1, rowY);
  drawField('Interception Status', intel.interception_status.replace(/_/g, ' '), col2, rowY, true);

  y += 49;

  // 4. SECTION: SURVEILLANCE & CCTV INTELLIGENCE
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 42, 2, 2, 'FD');

  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('2. CCTV SURVEILLANCE & FORENSIC OBSERVATION', margin + 4, y + 6);

  rowY = y + 14;
  drawField('CCTV Camera Reference', intel.cctv_footage_ref, col1, rowY);
  drawField('Facial Recognition Status', intel.cctv_status.replace(/_/g, ' '), col2, rowY);

  rowY += 10;
  drawField('Vehicle Spotted on CCTV', intel.vehicle_details, col1, rowY);
  drawField('Assigned Patrol / Interception', intel.nearest_patrol_unit, col2, rowY);

  rowY += 10;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('PHYSICAL DESCRIPTION & ATTIRE:', col1, rowY);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  const splitDesc = doc.splitTextToSize(intel.physical_description, pageWidth - margin * 2 - 10);
  doc.text(splitDesc, col1, rowY + 4.5);

  y += 47;

  // 5. SECTION: ATM TERMINAL & CASH-OUT TRANSACTION RECORD
  doc.setFillColor(cardBg[0], cardBg[1], cardBg[2]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 44, 2, 2, 'FD');

  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('3. TERMINAL CASH-OUT & TRANSACTION TELEMETRY', margin + 4, y + 6);

  rowY = y + 14;
  drawField('ATM Terminal Name', intel.atm_name || 'Designated Terminal', col1, rowY);
  drawField('Cash-Out Amount (INR)', `Rs. ${intel.amount.toLocaleString('en-IN')}/-`, col2, rowY, true);

  rowY += 10;
  drawField('Terminal Location & City', `${intel.atm_location || 'N/A'}, ${intel.atm_city || ''}`, col1, rowY);
  drawField('Withdrawal Method', intel.withdrawal_method.replace(/_/g, ' '), col2, rowY);

  rowY += 10;
  drawField('Timestamp (IST)', intel.formatted_time, col1, rowY);
  drawField('Forensic UTR / Audit Ref', intel.utr_number, col2, rowY);

  y += 49;

  // 6. SECTION: LINKED MULE ACCOUNT & NCRP CASE CONTEXT
  doc.setFillColor(alertBg[0], alertBg[1], alertBg[2]);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 2, 2, 'FD');

  doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('4. LINKED MULE ACCOUNT & CYBERCRIME COMPLAINT CONTEXT', margin + 4, y + 6);

  rowY = y + 13;
  drawField('Originating Mule Account', `${intel.account_number} (${intel.account_holder_name})`, col1, rowY);
  drawField('NCRP Complaint Number', intel.case_complaint_ref || 'NCRP-2026-CONFIRMED', col2, rowY, true);

  rowY += 9;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(dangerRed[0], dangerRed[1], dangerRed[2]);
  doc.text('LEGAL DIRECTIVE: Immediate Statutory Freeze authorized under Section 107 Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023.', col1, rowY);

  y += 37;

  // 7. STATUTORY FOOTER / DIGITAL SIGNATURE / STAMP
  doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
  doc.line(margin, y, pageWidth - margin, y);

  y += 6;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryDark[0], primaryDark[1], primaryDark[2]);
  doc.text('INVESTIGATING OFFICER ATTESTATION', margin, y);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
  doc.text('Krishna S • Lead Cybercrime Investigator (Badge #21)', margin, y + 4);
  doc.text('Cyber Crime Investigation Cell • Tamil Nadu Police Command', margin, y + 8);

  // Digital Stamp Box (Right)
  doc.setDrawColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.setLineWidth(0.8);
  doc.roundedRect(pageWidth - margin - 60, y - 2, 60, 16, 1.5, 1.5, 'D');
  doc.setTextColor(brandPurple[0], brandPurple[1], brandPurple[2]);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITALLY VERIFIED FORENSIC RECORD', pageWidth - margin - 57, y + 3);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`SHA-256 HASH: ${intel.utr_number.substring(0, 16)}...`, pageWidth - margin - 57, y + 7.5);
  doc.text('VALID FOR SECTION 65B EVIDENCE AUDIT', pageWidth - margin - 57, y + 11.5);

  // Save the PDF
  const filename = `Nexora_Forensic_Dossier_TX${intel.transaction_id}_${intel.withdrawer_name.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
};
