package com.ticketpro.api.service;

import com.ticketpro.api.dto.TicketRequest;
import com.ticketpro.api.dto.TicketResponse;
import com.ticketpro.api.entity.*;
import com.ticketpro.api.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DynamicFormSubmissionTest {

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserService userService;

    @Mock
    private CategoryService categoryService;

    @Mock
    private SlaPolicyRepository slaPolicyRepository;

    @Mock
    private FormTemplateRepository formTemplateRepository;

    @Mock
    private FormFieldRepository formFieldRepository;

    @Mock
    private FormSubmissionValueRepository formSubmissionValueRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private TicketHistoryService ticketHistoryService;

    @Mock
    private SlaService slaService;

    @Mock
    private NotificationService notificationService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private TicketService ticketService;

    private Company companyA;
    private Company companyB;
    private User creator;
    private Category categoryHardware;
    private FormTemplate templateHardware;
    private FormField fieldDeviceType;
    private FormField fieldSerialNumber;
    private FormField fieldQuantity;
    private FormField fieldPurchaseDate;

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

        creator = new User();
        creator.setId(10L);
        creator.setEmail("support@acme.com");
        creator.setName("Acme Support");
        creator.setCompany(companyA);
        creator.setRole(Role.COMPANY_ADMIN);

        categoryHardware = new Category();
        categoryHardware.setId(100L);
        categoryHardware.setName("Hardware");
        categoryHardware.setCompany(companyA);
        categoryHardware.setStatus(CategoryStatus.ACTIVE);

        // Form template for Hardware category
        templateHardware = new FormTemplate();
        templateHardware.setId(50L);
        templateHardware.setCompany(companyA);
        templateHardware.setCategory(categoryHardware);
        templateHardware.setName("Hardware Intake Form");
        templateHardware.setStatus("ACTIVE");

        // 1. Device Type (DROPDOWN, Required, Options: Laptop, Desktop)
        fieldDeviceType = new FormField();
        fieldDeviceType.setId(101L);
        fieldDeviceType.setFormTemplate(templateHardware);
        fieldDeviceType.setFieldKey("deviceType");
        fieldDeviceType.setLabel("Device Type");
        fieldDeviceType.setFieldType("DROPDOWN");
        fieldDeviceType.setRequired(true);

        FormFieldOption opt1 = new FormFieldOption(1L, fieldDeviceType, "Laptop", "Laptop", 0);
        FormFieldOption opt2 = new FormFieldOption(2L, fieldDeviceType, "Desktop", "Desktop", 1);
        fieldDeviceType.setOptions(List.of(opt1, opt2));

        // 2. Serial Number (TEXT, Required)
        fieldSerialNumber = new FormField();
        fieldSerialNumber.setId(102L);
        fieldSerialNumber.setFormTemplate(templateHardware);
        fieldSerialNumber.setFieldKey("serialNumber");
        fieldSerialNumber.setLabel("Serial Number");
        fieldSerialNumber.setFieldType("TEXT");
        fieldSerialNumber.setRequired(true);

        // 3. Quantity (NUMBER, Required)
        fieldQuantity = new FormField();
        fieldQuantity.setId(103L);
        fieldQuantity.setFormTemplate(templateHardware);
        fieldQuantity.setFieldKey("quantity");
        fieldQuantity.setLabel("Quantity");
        fieldQuantity.setFieldType("NUMBER");
        fieldQuantity.setRequired(true);

        // 4. Purchase Date (DATE, Optional)
        fieldPurchaseDate = new FormField();
        fieldPurchaseDate.setId(104L);
        fieldPurchaseDate.setFormTemplate(templateHardware);
        fieldPurchaseDate.setFieldKey("purchaseDate");
        fieldPurchaseDate.setLabel("Purchase Date");
        fieldPurchaseDate.setFieldType("DATE");
        fieldPurchaseDate.setRequired(false);

        templateHardware.setFields(List.of(fieldDeviceType, fieldSerialNumber, fieldQuantity, fieldPurchaseDate));

        ReflectionTestUtils.setField(ticketService, "formTemplateRepository", formTemplateRepository);
        ReflectionTestUtils.setField(ticketService, "formSubmissionValueRepository", formSubmissionValueRepository);
    }

    @Test
    @DisplayName("Issue 4 - Test 1: Successful dynamic form submission validates types and persists FormSubmissionValue")
    void testCreateTicket_WithDynamicForm_SuccessfulSubmission() {
        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findByCompanyIdAndCategoryId(companyA.getId(), 100L))
                .thenReturn(Optional.of(templateHardware));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            t.setId(555L);
            t.setTicketNumber("#ACME-555");
            return t;
        });

        TicketRequest request = new TicketRequest();
        request.setSubject("Broken Laptop Screen");
        request.setDescription("Screen is flickering");
        request.setCategoryId(100L);

        Map<String, Object> formValues = new LinkedHashMap<>();
        formValues.put("deviceType", "Laptop");
        formValues.put("serialNumber", "ABC-12345");
        formValues.put("quantity", 2);
        formValues.put("purchaseDate", "2026-05-15");
        request.setFormValues(formValues);

        Ticket created = ticketService.createTicket(request, companyA, creator);

        assertNotNull(created);
        assertEquals(555L, created.getId());

        // Verify that FormSubmissionValue entities were saved
        ArgumentCaptor<FormSubmissionValue> captor = ArgumentCaptor.forClass(FormSubmissionValue.class);
        verify(formSubmissionValueRepository, times(4)).save(captor.capture());

        List<FormSubmissionValue> savedValues = captor.getAllValues();
        assertEquals(4, savedValues.size());

        Map<String, String> persistedMap = new HashMap<>();
        for (FormSubmissionValue sv : savedValues) {
            assertEquals(created, sv.getTicket());
            persistedMap.put(sv.getField().getFieldKey(), sv.getValue());
        }

        assertEquals("Laptop", persistedMap.get("deviceType"));
        assertEquals("ABC-12345", persistedMap.get("serialNumber"));
        assertEquals("2", persistedMap.get("quantity"));
        assertEquals("2026-05-15", persistedMap.get("purchaseDate"));

        // Verify TicketResponse DTO maps form submission values correctly
        TicketResponse response = TicketResponse.from(created, savedValues);
        assertNotNull(response.getFormValues());
        assertEquals("Laptop", response.getFormValues().get("deviceType"));
        assertEquals("ABC-12345", response.getFormValues().get("serialNumber"));
    }

    @Test
    @DisplayName("Issue 4 - Test 2: Missing required dynamic form field is rejected on backend")
    void testCreateTicket_WithDynamicForm_MissingRequiredField_Fails() {
        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findByCompanyIdAndCategoryId(companyA.getId(), 100L))
                .thenReturn(Optional.of(templateHardware));

        TicketRequest request = new TicketRequest();
        request.setSubject("Missing Serial Number");
        request.setCategoryId(100L);

        Map<String, Object> formValues = new HashMap<>();
        formValues.put("deviceType", "Laptop");
        // "serialNumber" is deliberately missing
        formValues.put("quantity", 1);
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.createTicket(request, companyA, creator);
        });

        assertTrue(ex.getMessage().contains("serialNumber") || ex.getMessage().contains("Serial Number"),
                "Exception message must mention missing required field: " + ex.getMessage());
        verify(ticketRepository, never()).save(any());
        verify(formSubmissionValueRepository, never()).saveAll(any());
    }

    @Test
    @DisplayName("Issue 4 - Test 3: Invalid NUMBER field type is rejected on backend")
    void testCreateTicket_WithDynamicForm_InvalidNumberType_Fails() {
        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findByCompanyIdAndCategoryId(companyA.getId(), 100L))
                .thenReturn(Optional.of(templateHardware));

        TicketRequest request = new TicketRequest();
        request.setSubject("Invalid Quantity");
        request.setCategoryId(100L);

        Map<String, Object> formValues = new HashMap<>();
        formValues.put("deviceType", "Laptop");
        formValues.put("serialNumber", "XYZ-999");
        formValues.put("quantity", "not-a-valid-number"); // Invalid NUMBER
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.createTicket(request, companyA, creator);
        });

        assertTrue(ex.getMessage().contains("must be a valid number"),
                "Exception message must indicate number format failure: " + ex.getMessage());
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("Issue 4 - Test 4: Invalid DROPDOWN option is rejected on backend")
    void testCreateTicket_WithDynamicForm_InvalidDropdownOption_Fails() {
        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findByCompanyIdAndCategoryId(companyA.getId(), 100L))
                .thenReturn(Optional.of(templateHardware));

        TicketRequest request = new TicketRequest();
        request.setSubject("Invalid Device Type");
        request.setCategoryId(100L);

        Map<String, Object> formValues = new HashMap<>();
        formValues.put("deviceType", "Smartphone"); // "Smartphone" is NOT in {Laptop, Desktop}
        formValues.put("serialNumber", "XYZ-999");
        formValues.put("quantity", 1);
        request.setFormValues(formValues);

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () -> {
            ticketService.createTicket(request, companyA, creator);
        });

        assertTrue(ex.getMessage().contains("Invalid option"),
                "Exception message must reject invalid dropdown option: " + ex.getMessage());
        verify(ticketRepository, never()).save(any());
    }

    @Test
    @DisplayName("Issue 4 - Test 5: Tenant isolation prevents cross-tenant template usage")
    void testCreateTicket_WithDynamicForm_TenantIsolation() {
        // Category belongs to Company A
        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);

        // Form template query filters by companyA.getId()
        when(formTemplateRepository.findByCompanyIdAndCategoryId(companyA.getId(), 100L))
                .thenReturn(Optional.empty());

        TicketRequest request = new TicketRequest();
        request.setSubject("Tenant Isolation Ticket");
        request.setCategoryId(100L);

        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            t.setId(999L);
            return t;
        });

        Ticket created = ticketService.createTicket(request, companyA, creator);
        assertNotNull(created);

        // Verify companyB template was never queried or used
        verify(formTemplateRepository, never()).findByCompanyIdAndCategoryId(eq(companyB.getId()), any());
    }
}
