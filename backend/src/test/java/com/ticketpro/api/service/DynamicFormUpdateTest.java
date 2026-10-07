package com.ticketpro.api.service;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DynamicFormUpdateTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private FormTemplateRepository formTemplateRepository;

    @Mock
    private FormSubmissionValueRepository formSubmissionValueRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private SlaPolicyRepository slaPolicyRepository;

    @InjectMocks
    private TicketService ticketService;

    private Company companyA;
    private Company companyB;
    private User adminA;
    private Category categoryHardware;
    private FormTemplate templateV1;
    private FormField fieldSerial;
    private FormField fieldType;
    private FormField fieldRequiredNotes;
    private Ticket existingTicket;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyName("Acme Corp");
        companyA.setCompanyCode("ACME");
        companyA.setStatus(CompanyStatus.ACTIVE);

        companyB = new Company();
        companyB.setId(2L);
        companyB.setCompanyName("Beta Corp");
        companyB.setCompanyCode("BETA");
        companyB.setStatus(CompanyStatus.ACTIVE);

        adminA = new User();
        adminA.setId(10L);
        adminA.setName("Acme Admin");
        adminA.setEmail("admin@acme.com");
        adminA.setCompany(companyA);
        adminA.setRole(Role.COMPANY_ADMIN);

        categoryHardware = new Category();
        categoryHardware.setId(100L);
        categoryHardware.setName("Hardware");
        categoryHardware.setCompany(companyA);

        templateV1 = new FormTemplate();
        templateV1.setId(50L);
        templateV1.setCompany(companyA);
        templateV1.setCategory(categoryHardware);
        templateV1.setVersion(1);
        templateV1.setStatus("ACTIVE");

        fieldSerial = new FormField(101L, templateV1, "TEXT", "Serial Number", "serialNumber", "", false, 0, null, null, new ArrayList<>(), null, null);
        fieldType = new FormField(102L, templateV1, "DROPDOWN", "Problem Type", "problemType", "", false, 1, null, null, List.of(
                new FormFieldOption(1L, null, "Screen", "Screen", 0),
                new FormFieldOption(2L, null, "Battery", "Battery", 1)
        ), null, null);
        fieldRequiredNotes = new FormField(103L, templateV1, "TEXT", "Required Notes", "requiredNotes", "", true, 2, null, null, new ArrayList<>(), null, null);

        templateV1.setFields(List.of(fieldSerial, fieldType, fieldRequiredNotes));

        existingTicket = new Ticket();
        existingTicket.setId(100L);
        existingTicket.setTicketNumber("#ACME-100");
        existingTicket.setCompany(companyA);
        existingTicket.setCreatedBy(adminA);
        existingTicket.setCategory(categoryHardware);
        existingTicket.setFormTemplate(templateV1);
        existingTicket.setStatus(TicketStatus.OPEN);
        existingTicket.setPriority(Priority.MEDIUM);
        existingTicket.setSubject("Initial Ticket Subject");
        existingTicket.setDescription("Initial Description");

        lenient().when(userRepository.findById(10L)).thenReturn(Optional.of(adminA));
        lenient().when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(formSubmissionValueRepository.findByTicketIdAndFieldId(anyLong(), anyLong())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("Update existing dynamic value: serialNumber changed from ABC123 to XYZ999")
    void testUpdateExistingDynamicValue() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        FormSubmissionValue existingSub = new FormSubmissionValue(existingTicket, fieldSerial, "ABC123");
        when(formSubmissionValueRepository.findByTicketIdAndFieldId(100L, 101L))
                .thenReturn(Optional.of(existingSub));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new LinkedHashMap<>();
        formValues.put("serialNumber", "XYZ999");
        formValues.put("requiredNotes", "Some required note");
        request.setFormValues(formValues);

        ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);

        assertEquals("XYZ999", existingSub.getValue());
        verify(formSubmissionValueRepository).save(existingSub);
    }

    @Test
    @DisplayName("Add new dynamic value: newly supplied valid field creates FormSubmissionValue")
    void testAddNewDynamicValue() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new LinkedHashMap<>();
        formValues.put("problemType", "Battery");
        formValues.put("requiredNotes", "Initial notes");
        request.setFormValues(formValues);

        ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);

        verify(formSubmissionValueRepository, atLeastOnce()).save(any(FormSubmissionValue.class));
    }

    @Test
    @DisplayName("Reject invalid field key or ID not present in form template")
    void testRejectInvalidFieldKey() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new HashMap<>();
        formValues.put("nonExistentFieldKey999", "secretValue");
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);
        });

        assertTrue(ex.getMessage().contains("Invalid form field"));
    }

    @Test
    @DisplayName("Reject field from another company")
    void testRejectFieldFromAnotherCompany() {
        FormTemplate templateB = new FormTemplate();
        templateB.setId(99L);
        templateB.setCompany(companyB);
        templateB.setFields(List.of(new FormField(999L, templateB, "TEXT", "Foreign", "foreign", "", false, 0, null, null, new ArrayList<>(), null, null)));

        existingTicket.setFormTemplate(templateB);
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = Map.of("foreign", "value");
        request.setFormValues(formValues);

        assertThrows(SecurityException.class, () -> {
            ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);
        });
    }

    @Test
    @DisplayName("Reject invalid DROPDOWN option during update")
    void testRejectInvalidDropdownOption() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new HashMap<>();
        formValues.put("problemType", "InvalidOptionName");
        formValues.put("requiredNotes", "Valid notes");
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);
        });

        assertTrue(ex.getMessage().contains("Invalid option"));
    }

    @Test
    @DisplayName("Validate required fields on update: missing required field throws exception")
    void testValidateRequiredFieldsOnUpdate() {
        when(ticketRepository.findById(100L)).thenReturn(Optional.of(existingTicket));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new HashMap<>();
        formValues.put("serialNumber", "ABC123");
        // "requiredNotes" is missing and has no prior submission value
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);
        });

        assertTrue(ex.getMessage().contains("Required form field"));
    }
}
