package com.ticketpro.api.controller;

import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.ReportExportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Enterprise Analytics & Report Export Controller.
 * Streams formatted spreadsheet (XLSX) and executive summary (PDF) documents
 * with strict multi-tenant boundary isolation.
 */
@RestController
@RequestMapping(path = {"/api/v1/reports/export", "/api/reports/export"})
@RequiredArgsConstructor
@Validated
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'COMPANY_ADMIN', 'MANAGER')")
@Tag(name = "Reports & Analytics", description = "Endpoints for generating downloadable Excel and PDF operational compliance reports.")
public class ReportExportController {

    private final ReportExportService reportExportService;

    @GetMapping("/excel")
    @Operation(
            summary = "Export ticket audit report to Excel",
            description = "Generates an XLSX spreadsheet containing filtered ticket metrics, SLA breaches, and resolution details."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Excel file generated and streamed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid date range or company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant export denied", content = @Content)
    })
    public ResponseEntity<byte[]> exportTicketsExcel(
            @Parameter(description = "Optional tenant filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @Parameter(description = "Start datetime filter (ISO-8601)", example = "2026-01-01T00:00:00")
            @RequestParam(name = "fromDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @Parameter(description = "End datetime filter (ISO-8601)", example = "2026-12-31T23:59:59")
            @RequestParam(name = "toDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) throws IOException {
        Long targetCompanyId = resolveCompanyId(companyId, userDetails);
        byte[] excelBytes = reportExportService.generateTicketsExcelReport(targetCompanyId, fromDate, toDate);
        String filename = "TicketPro_Audit_Report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".xlsx";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(excelBytes);
    }

    @GetMapping("/pdf")
    @Operation(
            summary = "Export executive SLA report to PDF",
            description = "Generates a styled PDF executive briefing on SLA compliance, breach statistics, and resolution speed."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "PDF file generated and streamed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid date range or company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant export denied", content = @Content)
    })
    public ResponseEntity<byte[]> exportTicketsPdf(
            @Parameter(description = "Optional tenant filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @Parameter(description = "Start datetime filter (ISO-8601)", example = "2026-01-01T00:00:00")
            @RequestParam(name = "fromDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fromDate,
            @Parameter(description = "End datetime filter (ISO-8601)", example = "2026-12-31T23:59:59")
            @RequestParam(name = "toDate", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime toDate,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) {
        Long targetCompanyId = resolveCompanyId(companyId, userDetails);
        byte[] pdfBytes = reportExportService.generateTicketsPdfReport(targetCompanyId, fromDate, toDate);
        String filename = "TicketPro_SLA_Executive_Report_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmm")) + ".pdf";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/agents-excel")
    @Operation(
            summary = "Export agent KPI report to Excel",
            description = "Generates an XLSX spreadsheet evaluating individual support agent productivity, CSAT scores, and resolution counts."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Agent KPI report generated and streamed successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid company ID supplied", content = @Content),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Authentication required", content = @Content),
            @ApiResponse(responseCode = "403", description = "Forbidden - Cross-tenant export denied", content = @Content)
    })
    public ResponseEntity<byte[]> exportAgentsExcel(
            @Parameter(description = "Optional tenant filter (Super Admins only)", example = "1")
            @RequestParam(name = "companyId", required = false)
            @Positive(message = "Company ID must be a positive integer") Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails
    ) throws IOException {
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
        if (userDetails.getRole() == com.ticketpro.api.entity.Role.END_USER) {
            throw new SecurityException("End users are not authorized to view reports.");
        }
        if (userDetails.getRole() == com.ticketpro.api.entity.Role.SUPER_ADMIN) {
            return requestedCompanyId;
        }
        Long userCompanyId = userDetails.getCompanyId();
        if (requestedCompanyId != null && !requestedCompanyId.equals(userCompanyId)) {
            throw new SecurityException("Cross-tenant report access is denied.");
        }
        return userCompanyId;
    }
}
