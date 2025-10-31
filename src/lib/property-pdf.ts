/**
 * Property Details PDF Generation
 *
 * Generates comprehensive PDF reports for property details
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Property } from './schemas';
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate PDF for property details
 */
export async function generatePropertyPDF(property: Property): Promise<string> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  // Helper to check if we need a new page
  const checkNewPage = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  try {
    // ===== HEADER =====
    doc.setFillColor(30, 58, 138); // Blue background
    doc.rect(0, 0, pageWidth, 40, 'F');

    // Logo/Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Casa & Concierge', margin, 20);

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Property Management System', margin, 30);

    // Document info
    doc.setFontSize(10);
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    doc.text(`Generated: ${dateStr}`, pageWidth - margin - 80, 25);

    yPosition = 50;
    doc.setTextColor(0, 0, 0);

    // ===== PROPERTY TITLE =====
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${String(property.property_type || 'Property')} - Details`, margin, yPosition);
    yPosition += 10;

    // Status badges
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const badges: string[] = [];
    if (property.is_active) badges.push('ACTIVE');
    if (property.is_booking) badges.push('BOOKING AVAILABLE');
    if (property.is_pets_allowed) badges.push('PET FRIENDLY');

    if (badges.length > 0) {
      doc.text(badges.join(' • '), margin, yPosition);
      yPosition += 8;
    }

    // ===== OWNER INFORMATION =====
    checkNewPage();
    yPosition += 5;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Owner Information', margin, yPosition);
    yPosition += 8;
    doc.setTextColor(0, 0, 0);

    const ownerData = [
      ['Name', `${String(property.owner?.first_name || '')} ${String(property.owner?.last_name || '')}`],
      ['Email', String(property.owner?.email || 'N/A')],
      ['Phone', String(property.owner?.phone_number || 'N/A')],
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [],
      body: ownerData,
      theme: 'grid',
      styles: { fontSize: 10 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 'auto' }
      },
      margin: { left: margin, right: margin }
    });
    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // ===== PROPERTY DETAILS =====
    checkNewPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 58, 138);
    doc.text('Property Details', margin, yPosition);
    yPosition += 8;
    doc.setTextColor(0, 0, 0);

    const propertyDetails = [];
    if (property.size_sqf) propertyDetails.push(['Size', `${property.size_sqf} sq ft`]);
    if (property.num_bedrooms !== undefined) propertyDetails.push(['Bedrooms', String(property.num_bedrooms)]);
    if (property.num_bathrooms !== undefined) propertyDetails.push(['Bathrooms', String(property.num_bathrooms)]);
    if (property.num_half_bath !== undefined) propertyDetails.push(['Half Baths', String(property.num_half_bath)]);
    if (property.num_wcs !== undefined) propertyDetails.push(['WCs', String(property.num_wcs)]);
    if (property.num_kitchens !== undefined) propertyDetails.push(['Kitchens', String(property.num_kitchens)]);
    if (property.num_living_rooms !== undefined) propertyDetails.push(['Living Rooms', String(property.num_living_rooms)]);
    if (property.capacity) propertyDetails.push(['Capacity', `${property.capacity} / ${property.max_capacity || property.capacity}`]);

    if (propertyDetails.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: propertyDetails,
        theme: 'grid',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== LOCATION =====
    if (property.location) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Location', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const locationData = [];
      if (property.location.address) locationData.push(['Address', String(property.location.address)]);
      if (property.location.city) locationData.push(['City', String(property.location.city)]);
      if (property.location.state) locationData.push(['State', String(property.location.state)]);
      if (property.location.postal_code) locationData.push(['Postal Code', String(property.location.postal_code)]);
      if (property.location.country) locationData.push(['Country', String(property.location.country)]);
      if (property.location.latitude && property.location.longitude) {
        locationData.push(['Coordinates', `${property.location.latitude}, ${property.location.longitude}`]);
      }

      if (locationData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: locationData,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ===== COMMUNICATION =====
    if (property.communication) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Communication', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const commData = [];
      if (property.communication.phone_number) commData.push(['Phone', String(property.communication.phone_number)]);
      if (property.communication.wifi_name) commData.push(['WiFi Network', String(property.communication.wifi_name)]);
      if (property.communication.wifi_password) commData.push(['WiFi Password', String(property.communication.wifi_password)]);

      if (commData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: commData,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ===== ACCESS INFORMATION =====
    if (property.access) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Access Information', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const accessData = [];
      if (property.access.gate_code) accessData.push(['Gate Code', String(property.access.gate_code)]);
      if (property.access.door_lock_password) accessData.push(['Door Lock', String(property.access.door_lock_password)]);
      if (property.access.alarm_passcode) accessData.push(['Alarm Code', String(property.access.alarm_passcode)]);

      if (accessData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: accessData,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ===== EXTRAS =====
    if (property.extras) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Additional Information', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const extrasData = [];
      if (property.extras.storage_number) {
        extrasData.push(['Storage Unit', String(property.extras.storage_number)]);
        if (property.extras.storage_code) {
          extrasData.push(['Storage Code', String(property.extras.storage_code)]);
        }
      }
      if (property.extras.garage_number) extrasData.push(['Garage', String(property.extras.garage_number)]);
      if (property.extras.mailing_box) extrasData.push(['Mailbox', String(property.extras.mailing_box)]);
      if (property.extras.front_desk) extrasData.push(['Front Desk', String(property.extras.front_desk)]);
      if (property.extras.pool_access_code) extrasData.push(['Pool Access', String(property.extras.pool_access_code)]);

      if (extrasData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: extrasData,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ===== UNITS =====
    if (property.units && property.units.length > 0) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text(`Units (${property.units.length})`, margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const unitsData = property.units.map((unit, idx) => [
        `Unit ${idx + 1}`,
        String(unit.property_name || 'N/A'),
        String(unit.license_number || 'N/A'),
        String(unit.folio || 'N/A')
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['#', 'Name', 'License', 'Folio']],
        body: unitsData,
        theme: 'striped',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 58, 138] },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== AMENITIES =====
    if (property.amenities && property.amenities.length > 0) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Amenities', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      const amenitiesList = property.amenities.map(a => `• ${String(a.amenity_name)}`).join('\n');
      const splitAmenities = doc.splitTextToSize(amenitiesList, pageWidth - 2 * margin);
      doc.text(splitAmenities, margin, yPosition);
      yPosition += splitAmenities.length * 5 + 10;
    }

    // ===== RULES =====
    if (property.rules && property.rules.length > 0) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('House Rules', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      const rulesList = property.rules.map(r => `• ${String(r.rule_name)}`).join('\n');
      const splitRules = doc.splitTextToSize(rulesList, pageWidth - 2 * margin);
      doc.text(splitRules, margin, yPosition);
      yPosition += splitRules.length * 5 + 10;
    }

    // ===== DESCRIPTION =====
    if (property.description) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Property Description', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const splitDescription = doc.splitTextToSize(String(property.description), pageWidth - 2 * margin);
      doc.text(splitDescription, margin, yPosition);
      yPosition += splitDescription.length * 5 + 10;
    }

    // ===== FINANCIAL INFORMATION =====
    if (property.nightly_rate || property.cleaning_fee || property.security_deposit) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Financial Information', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const financialData = [];
      if (property.nightly_rate) financialData.push(['Nightly Rate', `$${property.nightly_rate}`]);
      if (property.cleaning_fee) financialData.push(['Cleaning Fee', `$${property.cleaning_fee}`]);
      if (property.security_deposit) financialData.push(['Security Deposit', `$${property.security_deposit}`]);

      autoTable(doc, {
        startY: yPosition,
        head: [],
        body: financialData,
        theme: 'grid',
        styles: { fontSize: 10 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { cellWidth: 'auto' }
        },
        margin: { left: margin, right: margin }
      });
      yPosition = (doc as any).lastAutoTable.finalY + 10;
    }

    // ===== EMERGENCY CONTACT =====
    if (property.emergency_contact) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Emergency Contact', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      const emergencyData = [];
      if (property.emergency_contact.name) emergencyData.push(['Name', String(property.emergency_contact.name)]);
      if (property.emergency_contact.phone) emergencyData.push(['Phone', String(property.emergency_contact.phone)]);
      if (property.emergency_contact.relationship) emergencyData.push(['Relationship', String(property.emergency_contact.relationship)]);

      if (emergencyData.length > 0) {
        autoTable(doc, {
          startY: yPosition,
          head: [],
          body: emergencyData,
          theme: 'grid',
          styles: { fontSize: 10 },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 50 },
            1: { cellWidth: 'auto' }
          },
          margin: { left: margin, right: margin }
        });
        yPosition = (doc as any).lastAutoTable.finalY + 10;
      }
    }

    // ===== HIGHLIGHTS =====
    if (property.highlights && property.highlights.length > 0) {
      checkNewPage();
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138);
      doc.text('Property Highlights', margin, yPosition);
      yPosition += 8;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      property.highlights.forEach((highlight: any) => {
        checkNewPage(20);
        doc.setFont('helvetica', 'bold');
        doc.text(`• ${String(highlight.title)}`, margin, yPosition);
        yPosition += 5;

        if (highlight.description) {
          doc.setFont('helvetica', 'normal');
          const splitDesc = doc.splitTextToSize(`  ${String(highlight.description)}`, pageWidth - 2 * margin - 5);
          doc.text(splitDesc, margin + 5, yPosition);
          yPosition += splitDesc.length * 5;
        }
        yPosition += 3;
      });
      yPosition += 5;
    }

    // ===== FOOTER =====
    const totalPages = doc.internal.pages.length - 1; // Subtract the first empty page
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      doc.text(
        'Casa & Concierge Property Management',
        margin,
        pageHeight - 10
      );
    }

    // ===== SAVE AND UPLOAD =====
    const blob = doc.output('blob');
    const fileName = `property_${property.property_id}_${Date.now()}.pdf`;
    const filePath = `property-documents/${fileName}`;

    console.log('Uploading property PDF to Supabase storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('property-documents')
      .upload(filePath, blob, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    console.log('PDF uploaded successfully:', uploadData.path);

    // Get signed URL (valid for 1 hour)
    const { data: urlData, error: urlError } = await supabase.storage
      .from('property-documents')
      .createSignedUrl(filePath, 3600);

    if (urlError) {
      console.error('URL generation error:', urlError);
      throw new Error(`Failed to generate URL: ${urlError.message}`);
    }

    return urlData.signedUrl;
  } catch (error: any) {
    console.error('Error generating property PDF:', error);
    throw new Error(`PDF generation failed: ${error.message || 'Unknown error'}`);
  }
}
