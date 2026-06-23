import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatTimestamp } from './locationUtils';

export function generateTraineePDF({ trainee, stats, dateRange, attendance, alerts }) {
  const doc = new jsPDF();
  
  // Branding colors
  const primaryNavy = '#1F3864'; // [31, 56, 100]
  const secondaryTeal = '#1F6B75'; // [31, 107, 117]
  const accentRed = '#B91C1C'; // [185, 28, 28]
  const textDark = '#1F2937';
  
  // Helper to format ISO Date to readable date
  const formatDateOnly = (dStr) => {
    if (!dStr) return '—';
    return new Date(dStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Header Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(31, 56, 100);
  doc.text('GeoTrack-RSP', 15, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(31, 107, 117);
  doc.text('RMHP SAFETY OPERATIONS · ROURKELA STEEL PLANT', 15, 25);
  
  // Horizontal divider
  doc.setDrawColor(31, 107, 117);
  doc.setLineWidth(0.5);
  doc.line(15, 28, 195, 28);
  
  // Title & Date generated
  doc.setFontSize(14);
  doc.setTextColor(31, 56, 100);
  doc.text('TRAINEE SAFETY & ATTENDANCE PERFORMANCE REPORT', 15, 38);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated on: ${dateStr}`, 15, 43);
  doc.text(`Report Period: ${formatDateOnly(dateRange.from)} to ${formatDateOnly(dateRange.to)}`, 15, 48);

  // Trainee Metadata Section
  doc.setFillColor(243, 244, 246);
  doc.rect(15, 54, 180, 36, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(31, 56, 100);
  doc.text('TRAINEE IDENTIFICATION DETAILS', 20, 60);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(55, 65, 81);
  
  // Left Column
  doc.text(`Full Name:      ${trainee.full_name}`, 20, 68);
  doc.text(`Employee ID:    ${trainee.employee_id || 'N/A'}`, 20, 74);
  doc.text(`Division:       ${trainee.division || 'N/A'}`, 20, 80);
  
  // Right Column
  doc.text(`Contact:        ${trainee.contact || 'No contact on file'}`, 110, 68);
  doc.text(`Institution:    ${trainee.institution || 'N/A'}`, 110, 74);
  doc.text(`Status:         ${trainee.is_active ? 'Active now' : 'Offline'}`, 110, 80);

  // Section 1: Summary Statistics Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 56, 100);
  doc.text('1. SUMMARY METRICS (FOR SELECTED RANGE)', 15, 102);

  // Stats table
  autoTable(doc, {
    startY: 106,
    theme: 'grid',
    headStyles: {
      fillColor: [31, 107, 117], // Teal
      textColor: [255, 255, 255],
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [31, 41, 55],
      halign: 'center'
    },
    head: [['Present Days', 'Absent Days', 'Late Arrivals', 'Total Hours Worked', 'SOS Signals', 'Geofence Breaches']],
    body: [[
      stats.daysPresent,
      stats.daysAbsent,
      stats.daysLate,
      `${stats.totalHours} hrs`,
      stats.sosAlerts,
      stats.breachAlerts
    ]],
    margin: { left: 15, right: 15 },
  });

  // Section 2: Attendance Table
  const attendanceStartY = doc.lastAutoTable.finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 56, 100);
  doc.text('2. SHIFT ATTENDANCE LOGS', 15, attendanceStartY);

  // Format attendance list for PDF
  const attendanceRows = attendance.map(log => {
    const elapsed = log.check_in && log.check_out 
      ? ((new Date(log.check_out) - new Date(log.check_in)) / (1000 * 60 * 60)).toFixed(1) + ' hrs'
      : '—';
    return [
      formatDateOnly(log.date),
      log.check_in ? new Date(log.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      log.check_out ? new Date(log.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—',
      elapsed,
      log.status.toUpperCase()
    ];
  });

  autoTable(doc, {
    startY: attendanceStartY + 4,
    theme: 'striped',
    headStyles: {
      fillColor: [31, 56, 100], // Navy
      textColor: [255, 255, 255],
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8.5
    },
    head: [['Date', 'Check-In', 'Check-Out', 'Duration', 'Status']],
    body: attendanceRows.length > 0 ? attendanceRows : [['No records reported for the selected range.', '', '', '', '']],
    margin: { left: 15, right: 15 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      4: { fontStyle: 'bold' }
    }
  });

  // Section 3: Safety Incidents Table
  const alertsStartY = doc.lastAutoTable.finalY + 12;
  
  // Check if we need to add a page first
  let nextSectionY = alertsStartY;
  if (alertsStartY > 240) {
    doc.addPage();
    nextSectionY = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(31, 56, 100);
  doc.text('3. SECURITY WARNINGS & SOS INCIDENTS', 15, nextSectionY);

  const alertRows = alerts.map(alert => [
    formatTimestamp(alert.created_at),
    alert.alert_type === 'SOS' ? '🚨 EMERGENCY SOS' : '⚠️ GEOFENCE BREACH',
    (alert.severity || 'medium').toUpperCase(),
    alert.message || '—',
    alert.resolved ? 'RESOLVED' : 'PENDING'
  ]);

  autoTable(doc, {
    startY: nextSectionY + 4,
    theme: 'striped',
    headStyles: {
      fillColor: [185, 28, 28], // Red accent
      textColor: [255, 255, 255],
      fontSize: 8
    },
    bodyStyles: {
      fontSize: 8
    },
    head: [['Date & Time', 'Incident Type', 'Severity', 'Description / Warning Message', 'Status']],
    body: alertRows.length > 0 ? alertRows : [['No safety breaches or SOS distress calls recorded.', '', '', '', '']],
    margin: { left: 15, right: 15 }
  });

  // Add Page Numbers & Footer on all pages
  const pagesCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pagesCount; i++) {
    doc.setPage(i);
    
    // Bottom border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.3);
    doc.line(15, 282, 195, 282);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(156, 163, 175);
    
    // Left footer
    doc.text('GeoTrack-RSP · Raw Material Handling Plant (RMHP), Rourkela Steel Plant', 15, 287);
    
    // Right footer
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${i} of ${pagesCount}`, 180, 287);
  }

  // Save the PDF
  const sanitizedName = trainee.full_name.replace(/\s+/g, '_');
  const dateFormatted = new Date().toISOString().split('T')[0];
  doc.save(`TraineeReport_${sanitizedName}_${dateFormatted}.pdf`);
}
