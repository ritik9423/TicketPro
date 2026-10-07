package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Role;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.ReportExportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/reports/export")
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
public class ReportExportController {

    private final ReportExportService reportExportService;

    public ReportExportController(ReportExportService reportExportService) {
        this.reportExportService = reportExportService;
    }

    @GetMapping("/excel")
    public ResponseEntity<byte[]> exportTicketsExcel(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(name = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws java.io.IOException {

        Long targetCompanyId = resolveCompanyId(companyId, userDetails);
        byte[] excelBytes = reportExportService.generateTicketsExcelReport(targetCompanyId, fromDate, toDate);
        String filename = "TicketPro_Audit_Report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/pdf")
    public ResponseEntity<byte[]> exportTicketsPdf(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @RequestParam(name = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @RequestParam(name = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        Long targetCompanyId = resolveCompanyId(companyId, userDetails);
        byte[] pdfBytes = reportExportService.generateTicketsPdfReport(targetCompanyId, fromDate, toDate);
        String filename = "TicketPro_SLA_Executive_Report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/agents-excel")
    public ResponseEntity<byte[]> exportAgentsExcel(
            @RequestParam(name = "companyId", required = false) Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) throws java.io.IOException {

        Long targetCompanyId = resolveCompanyId(companyId, userDetails);
        byte[] excelBytes = reportExportService.generateAgentPerformanceReport(targetCompanyId);
        String filename = "TicketPro_Agent_KPI_Performance_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    private Long resolveCompanyId(Long requestedCompanyId, CustomUserDetails userDetails) {
        if (userDetails == null) {
            throw new SecurityException("Authentication is required to access reports.");
        }
        if (userDetails.getRole() == Role.END_USER) {
            throw new SecurityException("End users are not authorized to view reports.");
        }
        if (userDetails.getRole() == Role.SUPER_ADMIN) {
            return requestedCompanyId;
        }
        Long userCompanyId = userDetails.getCompanyId();
        if (requestedCompanyId != null && !requestedCompanyId.equals(userCompanyId)) {
            throw new SecurityException("Cross-tenant report access is denied.");
        }
        return userCompanyId;
    }
}
