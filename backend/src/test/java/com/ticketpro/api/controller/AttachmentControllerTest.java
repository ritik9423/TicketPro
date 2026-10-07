package com.ticketpro.api.controller;

import com.ticketpro.api.entity.Attachment;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.AttachmentService;
import jakarta.servlet.ServletContext;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AttachmentControllerTest {

    @Mock private AttachmentService attachmentService;
    @Mock private UserRepository userRepository;
    @Mock private TicketRepository ticketRepository;
    @Mock private HttpServletRequest request;
    @Mock private ServletContext servletContext;

    private AttachmentController controller;

    @BeforeEach
    void setUp() {
        controller = new AttachmentController(attachmentService, userRepository, ticketRepository);
    }

    @Test
    void downloadAttachmentById_Unauthenticated_ThrowsSecurityException() {
        Attachment attachment = new Attachment();
        attachment.setId(1L);
        when(attachmentService.getAttachmentById(1L)).thenReturn(attachment);

        assertThrows(SecurityException.class, () ->
                controller.downloadAttachmentById(1L, null, request)
        );
    }

    @Test
    void downloadAttachmentById_CrossTenant_ThrowsSecurityException() {
        Company companyA = new Company();
        companyA.setId(100L);

        Ticket ticketA = new Ticket();
        ticketA.setCompany(companyA);

        Attachment attachment = new Attachment();
        attachment.setId(1L);
        attachment.setTicket(ticketA);

        when(attachmentService.getAttachmentById(1L)).thenReturn(attachment);

        Company companyB = new Company();
        companyB.setId(200L);
        User userFromCompanyB = new User();
        userFromCompanyB.setId(2L);
        userFromCompanyB.setCompany(companyB);
        userFromCompanyB.setRole(Role.COMPANY_ADMIN);
        CustomUserDetails userDetails = new CustomUserDetails(userFromCompanyB);

        assertThrows(SecurityException.class, () ->
                controller.downloadAttachmentById(1L, userDetails, request)
        );
    }

    @Test
    void downloadAttachmentById_EndUserNotOwner_ThrowsSecurityException() {
        Company company = new Company();
        company.setId(100L);

        User creator = new User();
        creator.setId(10L);

        Ticket ticket = new Ticket();
        ticket.setCompany(company);
        ticket.setCreatedBy(creator);

        Attachment attachment = new Attachment();
        attachment.setId(1L);
        attachment.setTicket(ticket);

        when(attachmentService.getAttachmentById(1L)).thenReturn(attachment);

        User otherEndUser = new User();
        otherEndUser.setId(20L); // different user
        otherEndUser.setCompany(company);
        otherEndUser.setRole(Role.END_USER);
        CustomUserDetails userDetails = new CustomUserDetails(otherEndUser);

        assertThrows(SecurityException.class, () ->
                controller.downloadAttachmentById(1L, userDetails, request)
        );
    }

    @Test
    void downloadAttachmentById_SuperAdmin_Allowed() {
        Company company = new Company();
        company.setId(100L);

        Ticket ticket = new Ticket();
        ticket.setCompany(company);

        Attachment attachment = new Attachment();
        attachment.setId(1L);
        attachment.setFileName("contract.pdf");
        attachment.setFileUrl("/api/attachments/download/contract.pdf");
        attachment.setTicket(ticket);

        when(attachmentService.getAttachmentById(1L)).thenReturn(attachment);

        Resource resource = new ByteArrayResource("PDF Content".getBytes());
        when(attachmentService.loadFileAsResource("contract.pdf")).thenReturn(resource);
        when(request.getServletContext()).thenReturn(servletContext);

        User superAdmin = new User();
        superAdmin.setId(1L);
        superAdmin.setRole(Role.SUPER_ADMIN);
        CustomUserDetails userDetails = new CustomUserDetails(superAdmin);

        ResponseEntity<?> response = controller.downloadAttachmentById(1L, userDetails, request);
        assertEquals(200, response.getStatusCode().value());
    }
}
