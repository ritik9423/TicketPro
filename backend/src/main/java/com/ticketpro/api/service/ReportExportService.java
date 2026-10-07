package com.ticketpro.api.service;

import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.CompanyRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReportExportService {

    private final TicketRepository ticketRepository;
    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public ReportExportService(TicketRepository ticketRepository, CompanyRepository companyRepository, UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.companyRepository = companyRepository;
        this.userRepository = userRepository;
    }

    private List<Ticket> fetchScopedTickets(Long companyId, LocalDateTime fromDate, LocalDateTime toDate) {
        List<Ticket> list = companyId != null ? ticketRepository.findByCompanyId(companyId) : ticketRepository.findAll();
        return list.stream()
                .filter(t -> fromDate == null || (t.getCreatedAt() != null && !t.getCreatedAt().isBefore(fromDate)))
                .filter(t -> toDate == null || (t.getCreatedAt() != null && !t.getCreatedAt().isAfter(toDate)))
                .collect(Collectors.toList());
    }

    /**
     * 1. Generates Styled Excel (.xlsx) Report with Audit & Metrics
     */
    public byte[] generateTicketsExcelReport(Long companyId, LocalDateTime fromDate, LocalDateTime toDate) throws IOException {
        List<Ticket> tickets = fetchScopedTickets(companyId, fromDate, toDate);
        Company company = companyId != null ? companyRepository.findById(companyId).orElse(null) : null;
        String compName = company != null ? company.getCompanyName() : "TicketPro Enterprise Platform";

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            
            // Sheet 1: Detailed Tickets
            Sheet sheet = workbook.createSheet("Tickets Audit");

            // Fonts & Styles
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerFont.setFontHeightInPoints((short) 11);

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.INDIGO.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);

            CellStyle breachStyle = workbook.createCellStyle();
            Font breachFont = workbook.createFont();
            breachFont.setColor(IndexedColors.RED.getIndex());
            breachFont.setBold(true);
            breachStyle.setFont(breachFont);

            CellStyle okStyle = workbook.createCellStyle();
            Font okFont = workbook.createFont();
            okFont.setColor(IndexedColors.GREEN.getIndex());
            okFont.setBold(true);
            okStyle.setFont(okFont);

            String[] columns = {
                    "Ticket #", "Subject", "Status", "Priority", "Department", 
                    "Category", "Customer Name", "Customer Email", "Assigned Agent", 
                    "Created At", "Resolved At", "SLA Breached", "Turnaround (Hours)"
            };

            // Title Row
            Row titleRow = sheet.createRow(0);
            Cell titleCell = titleRow.createCell(0);
            titleCell.setCellValue(compName + " - Helpdesk Performance Audit (" + tickets.size() + " Tickets)");
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            CellStyle titleStyle = workbook.createCellStyle();
            titleStyle.setFont(titleFont);
            titleCell.setCellStyle(titleStyle);

            // Header Row
            Row headerRow = sheet.createRow(2);
            headerRow.setHeightInPoints(24);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data Rows
            int rowIdx = 3;
            for (Ticket t : tickets) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(t.getTicketNumber() != null ? t.getTicketNumber() : "#TK-" + t.getId());
                row.createCell(1).setCellValue(t.getSubject() != null ? t.getSubject() : "");
                row.createCell(2).setCellValue(t.getStatus() != null ? t.getStatus().name() : "OPEN");
                row.createCell(3).setCellValue(t.getPriority() != null ? t.getPriority().name() : "MEDIUM");
                row.createCell(4).setCellValue(t.getDepartment() != null ? t.getDepartment() : "General Support");
                row.createCell(5).setCellValue(getSafeCategoryName(t));
                row.createCell(6).setCellValue(getSafeCreatorName(t));
                row.createCell(7).setCellValue(getSafeCreatorEmail(t));
                row.createCell(8).setCellValue(getSafeAgentName(t));
                row.createCell(9).setCellValue(t.getCreatedAt() != null ? t.getCreatedAt().format(DATE_FORMATTER) : "");
                row.createCell(10).setCellValue(t.getResolvedAt() != null ? t.getResolvedAt().format(DATE_FORMATTER) : "N/A");

                Cell breachCell = row.createCell(11);
                boolean breached = Boolean.TRUE.equals(t.getSlaBreached());
                breachCell.setCellValue(breached ? "BREACHED" : "COMPLIANT");
                breachCell.setCellStyle(breached ? breachStyle : okStyle);

                double hours = 0.0;
                if (t.getCreatedAt() != null) {
                    LocalDateTime end = t.getResolvedAt() != null ? t.getResolvedAt() : LocalDateTime.now();
                    hours = Duration.between(t.getCreatedAt(), end).toMinutes() / 60.0;
                }
                row.createCell(12).setCellValue(Math.round(hours * 10.0) / 10.0);
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    /**
     * 2. Generates Enterprise PDF Audit Report
     */
    public byte[] generateTicketsPdfReport(Long companyId, LocalDateTime fromDate, LocalDateTime toDate) throws DocumentException {
        List<Ticket> tickets = fetchScopedTickets(companyId, fromDate, toDate);
        Company company = companyId != null ? companyRepository.findById(companyId).orElse(null) : null;
        String compName = company != null ? company.getCompanyName() : "TicketPro Enterprise Platform";

        Document document = new Document(PageSize.A4.rotate(), 20, 20, 20, 20);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(document, out);

        document.open();

        // Colors
        Color primaryColor = new Color(79, 70, 229);
        Color darkSlate = new Color(15, 23, 42);
        Color lightGray = new Color(248, 250, 252);

        // Header Title
        com.lowagie.text.Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18, primaryColor);
        Paragraph title = new Paragraph("TICKETPRO ENTERPRISE HELPDESK AUDIT", titleFont);
        title.setAlignment(Element.ALIGN_CENTER);
        document.add(title);

        com.lowagie.text.Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 11, darkSlate);
        Paragraph sub = new Paragraph("Organization: " + compName + "  |  Generated on: " + LocalDateTime.now().format(DATE_FORMATTER), subtitleFont);
        sub.setAlignment(Element.ALIGN_CENTER);
        sub.setSpacingAfter(15);
        document.add(sub);

        // Metrics Summary Cards
        long total = tickets.size();
        long resolved = tickets.stream().filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED).count();
        long open = tickets.stream().filter(t -> t.getStatus() == TicketStatus.OPEN).count();
        long inProgress = tickets.stream().filter(t -> t.getStatus() == TicketStatus.IN_PROGRESS).count();
        long breached = tickets.stream().filter(t -> Boolean.TRUE.equals(t.getSlaBreached())).count();
        double complianceRate = total > 0 ? ((total - breached) * 100.0 / total) : 100.0;

        PdfPTable summaryTable = new PdfPTable(5);
        summaryTable.setWidthPercentage(100);
        summaryTable.setSpacingAfter(15);

        addKpiCell(summaryTable, "Total Tickets", String.valueOf(total), primaryColor);
        addKpiCell(summaryTable, "Open Tickets", String.valueOf(open), new Color(59, 130, 246));
        addKpiCell(summaryTable, "In Progress", String.valueOf(inProgress), new Color(245, 158, 11));
        addKpiCell(summaryTable, "Resolved", String.valueOf(resolved), new Color(16, 185, 129));
        addKpiCell(summaryTable, "SLA Compliance", String.format("%.1f%%", complianceRate), breached > 0 ? new Color(239, 68, 68) : new Color(16, 185, 129));

        document.add(summaryTable);

        // Detailed Table
        PdfPTable table = new PdfPTable(8);
        table.setWidthPercentage(100);
        table.setWidths(new float[]{1.6f, 3.2f, 1.4f, 1.4f, 2.0f, 2.0f, 1.6f, 1.4f});

        String[] headers = {"Ticket #", "Subject", "Status", "Priority", "Customer", "Agent", "Created", "SLA"};
        for (String h : headers) {
            PdfPCell cell = new PdfPCell(new Phrase(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
            cell.setBackgroundColor(primaryColor);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            cell.setPadding(6);
            table.addCell(cell);
        }

        com.lowagie.text.Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 8, darkSlate);
        boolean alt = false;
        for (Ticket t : tickets) {
            Color rowBg = alt ? lightGray : Color.WHITE;
            alt = !alt;

            addCell(table, t.getTicketNumber() != null ? t.getTicketNumber() : "#" + t.getId(), bodyFont, rowBg, Element.ALIGN_CENTER);
            addCell(table, t.getSubject() != null ? t.getSubject() : "", bodyFont, rowBg, Element.ALIGN_LEFT);
            addCell(table, t.getStatus() != null ? t.getStatus().name() : "OPEN", bodyFont, rowBg, Element.ALIGN_CENTER);
            addCell(table, t.getPriority() != null ? t.getPriority().name() : "MEDIUM", bodyFont, rowBg, Element.ALIGN_CENTER);
            addCell(table, getSafeCreatorName(t), bodyFont, rowBg, Element.ALIGN_LEFT);
            addCell(table, getSafeAgentName(t), bodyFont, rowBg, Element.ALIGN_LEFT);
            addCell(table, t.getCreatedAt() != null ? t.getCreatedAt().format(DateTimeFormatter.ofPattern("MM/dd HH:mm")) : "", bodyFont, rowBg, Element.ALIGN_CENTER);

            boolean isBreached = Boolean.TRUE.equals(t.getSlaBreached());
            com.lowagie.text.Font slaFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, isBreached ? new Color(220, 38, 38) : new Color(22, 163, 74));
            addCell(table, isBreached ? "BREACH" : "OK", slaFont, rowBg, Element.ALIGN_CENTER);
        }

        document.add(table);
        document.close();

        return out.toByteArray();
    }

    /**
     * 3. Generates Agent Performance Excel Report
     */
    public byte[] generateAgentPerformanceReport(Long companyId) throws IOException {
        List<User> agents = companyId != null 
                ? userRepository.findByCompanyIdAndRole(companyId, Role.AGENT) 
                : userRepository.findAll().stream().filter(u -> u.getRole() == Role.AGENT).collect(Collectors.toList());

        List<Ticket> tickets = companyId != null ? ticketRepository.findByCompanyId(companyId) : ticketRepository.findAll();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Agent Performance");

            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerStyle = workbook.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            String[] columns = {"Agent Name", "Email", "Department", "Assigned Tickets", "Resolved Tickets", "Pending", "SLA Breaches", "Resolution Rate (%)"};

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowIdx = 1;
            for (User agent : agents) {
                List<Ticket> agentTickets = tickets.stream()
                        .filter(t -> {
                            try {
                                return t.getAssignedTo() != null && t.getAssignedTo().getId() != null && t.getAssignedTo().getId().equals(agent.getId());
                            } catch (Exception ignored) {
                                return false;
                            }
                        })
                        .collect(Collectors.toList());

                long totalAssigned = agentTickets.size();
                long resolvedCount = agentTickets.stream()
                        .filter(t -> t.getStatus() == TicketStatus.RESOLVED || t.getStatus() == TicketStatus.CLOSED)
                        .count();
                long pendingCount = totalAssigned - resolvedCount;
                long breachCount = agentTickets.stream()
                        .filter(t -> Boolean.TRUE.equals(t.getSlaBreached()))
                        .count();
                double resRate = totalAssigned > 0 ? (resolvedCount * 100.0 / totalAssigned) : 0.0;

                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(agent.getName());
                row.createCell(1).setCellValue(agent.getEmail());
                row.createCell(2).setCellValue(agent.getDepartment() != null ? agent.getDepartment() : "Support");
                row.createCell(3).setCellValue(totalAssigned);
                row.createCell(4).setCellValue(resolvedCount);
                row.createCell(5).setCellValue(pendingCount);
                row.createCell(6).setCellValue(breachCount);
                row.createCell(7).setCellValue(Math.round(resRate * 10.0) / 10.0);
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    private void addKpiCell(PdfPTable table, String label, String value, Color color) {
        PdfPCell cell = new PdfPCell();
        cell.setPadding(8);
        cell.setBackgroundColor(new Color(248, 250, 252));
        cell.setBorderColor(new Color(226, 232, 240));
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);

        com.lowagie.text.Font valFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, color);
        Paragraph valP = new Paragraph(value, valFont);
        valP.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(valP);

        com.lowagie.text.Font lblFont = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(100, 116, 139));
        Paragraph lblP = new Paragraph(label, lblFont);
        lblP.setAlignment(Element.ALIGN_CENTER);
        cell.addElement(lblP);

        table.addCell(cell);
    }

    private void addCell(PdfPTable table, String text, com.lowagie.text.Font font, Color bg, int align) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setHorizontalAlignment(align);
        cell.setPadding(5);
        cell.setBorderColor(new Color(226, 232, 240));
        table.addCell(cell);
    }

    private String getSafeCategoryName(Ticket t) {
        try {
            if (t.getCategory() != null) return t.getCategory().getName();
        } catch (Exception ignored) {}
        return "General";
    }

    private String getSafeCreatorName(Ticket t) {
        try {
            if (t.getCreatedBy() != null) return t.getCreatedBy().getName();
        } catch (Exception ignored) {}
        return "Customer";
    }

    private String getSafeCreatorEmail(Ticket t) {
        try {
            if (t.getCreatedBy() != null) return t.getCreatedBy().getEmail();
        } catch (Exception ignored) {}
        return "";
    }

    private String getSafeAgentName(Ticket t) {
        try {
            if (t.getAssignedTo() != null) return t.getAssignedTo().getName();
        } catch (Exception ignored) {}
        return "Unassigned";
    }
}
