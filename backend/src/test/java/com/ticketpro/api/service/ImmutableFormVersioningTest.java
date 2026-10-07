package com.ticketpro.api.service;

import com.ticketpro.api.dto.FormFieldDto;
import com.ticketpro.api.dto.FormTemplateRequest;
import com.ticketpro.api.dto.FormTemplateResponse;
import com.ticketpro.api.dto.TicketRequest;
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
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ImmutableFormVersioningTest {

    @Mock
    private FormTemplateRepository formTemplateRepository;

    @Mock
    private CompanyRepository companyRepository;

    @Mock
    private CategoryRepository categoryRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private FormSubmissionValueRepository formSubmissionValueRepository;

    @Mock
    private CategoryService categoryService;

    @Mock
    private UserService userService;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private FormTemplateService formTemplateService;

    private TicketService ticketService;

    private Company companyA;
    private Category categoryHardware;
    private User creator;

    @BeforeEach
    void setUp() {
        companyA = new Company();
        companyA.setId(1L);
        companyA.setCompanyName("Acme Corp");
        companyA.setCompanyCode("ACME");
        companyA.setStatus(CompanyStatus.ACTIVE);

        categoryHardware = new Category();
        categoryHardware.setId(100L);
        categoryHardware.setName("Hardware");
        categoryHardware.setCompany(companyA);
        categoryHardware.setStatus(CategoryStatus.ACTIVE);

        creator = new User();
        creator.setId(10L);
        creator.setEmail("admin@acme.com");
        creator.setCompany(companyA);
        creator.setRole(Role.COMPANY_ADMIN);

        ticketService = new TicketService(
                ticketRepository,
                userService,
                categoryService,
                companyRepository,
                userRepository,
                mock(EmailService.class),
                mock(NotificationService.class),
                mock(SlaPolicyRepository.class),
                formTemplateRepository,
                formSubmissionValueRepository
        );

        lenient().when(companyRepository.findById(1L)).thenReturn(Optional.of(companyA));
        lenient().when(categoryRepository.findById(100L)).thenReturn(Optional.of(categoryHardware));
        lenient().when(userRepository.findById(any())).thenReturn(Optional.of(creator));
    }

    @Test
    @DisplayName("Test 1 — Create Version 1: Form template created with Version 1 and fields")
    void test1_CreateVersion1() {
        when(companyRepository.findById(1L)).thenReturn(Optional.of(companyA));
        when(categoryRepository.findById(100L)).thenReturn(Optional.of(categoryHardware));
        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> {
            FormTemplate ft = inv.getArgument(0);
            ft.setId(10L);
            long fieldIdCounter = 101L;
            for (FormField f : ft.getFields()) {
                f.setId(fieldIdCounter++);
            }
            return ft;
        });

        FormTemplateRequest request = new FormTemplateRequest();
        request.setCompanyId(1L);
        request.setCategoryId(100L);
        request.setName("Hardware Form");
        request.setDescription("Hardware intake form");

        FormFieldDto f1 = new FormFieldDto();
        f1.setFieldKey("deviceType");
        f1.setLabel("Device Type");
        f1.setFieldType("TEXT");
        f1.setRequired(true);

        FormFieldDto f2 = new FormFieldDto();
        f2.setFieldKey("serialNumber");
        f2.setLabel("Serial Number");
        f2.setFieldType("TEXT");
        f2.setRequired(true);

        request.setFields(List.of(f1, f2));

        FormTemplateResponse response = formTemplateService.createFormTemplate(request, 1L, Role.COMPANY_ADMIN, creator);

        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals(1, response.getVersion());
        assertEquals("ACTIVE", response.getStatus());
        assertEquals(2, response.getFields().size());
    }

    @Test
    @DisplayName("Test 2 — Submit Ticket Using Version 1: Ticket references Version 1 and form values stored")
    void test2_SubmitTicketUsingVersion1() {
        FormTemplate templateV1 = new FormTemplate();
        templateV1.setId(10L);
        templateV1.setCompany(companyA);
        templateV1.setCategory(categoryHardware);
        templateV1.setName("Hardware Form");
        templateV1.setVersion(1);
        templateV1.setStatus("ACTIVE");

        FormField f1 = new FormField(101L, templateV1, "TEXT", "Device Type", "deviceType", "", true, 0, null, null, new ArrayList<>(), null, null);
        FormField f2 = new FormField(102L, templateV1, "TEXT", "Serial Number", "serialNumber", "", true, 1, null, null, new ArrayList<>(), null, null);
        templateV1.setFields(List.of(f1, f2));

        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.of(templateV1));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            t.setId(100L);
            t.setTicketNumber("#ACME-100");
            return t;
        });

        TicketRequest request = new TicketRequest();
        request.setSubject("Laptop Display Issue");
        request.setDescription("Flickering screen");
        request.setCategoryId(100L);

        Map<String, Object> formValues = new LinkedHashMap<>();
        formValues.put("deviceType", "Laptop");
        formValues.put("serialNumber", "ABC123");
        request.setFormValues(formValues);

        Ticket ticket = ticketService.createTicket(request, companyA, creator);

        assertNotNull(ticket);
        assertEquals(templateV1, ticket.getFormTemplate());
        assertEquals(1, ticket.getFormTemplate().getVersion());

        ArgumentCaptor<FormSubmissionValue> captor = ArgumentCaptor.forClass(FormSubmissionValue.class);
        verify(formSubmissionValueRepository, times(2)).save(captor.capture());
        List<FormSubmissionValue> values = captor.getAllValues();
        assertEquals(2, values.size());
    }

    @Test
    @DisplayName("Test 3 — Update Form: Version 2 created, Version 1 remains unchanged in DB")
    void test3_UpdateForm_CreatesNewVersion() {
        FormTemplate templateV1 = new FormTemplate();
        templateV1.setId(10L);
        templateV1.setCompany(companyA);
        templateV1.setCategory(categoryHardware);
        templateV1.setName("Hardware Form");
        templateV1.setVersion(1);
        templateV1.setStatus("ACTIVE");

        FormField f1 = new FormField(101L, templateV1, "TEXT", "Device Type", "deviceType", "", true, 0, null, null, new ArrayList<>(), null, null);
        FormField f2 = new FormField(102L, templateV1, "TEXT", "Serial Number", "serialNumber", "", true, 1, null, null, new ArrayList<>(), null, null);
        templateV1.setFields(new ArrayList<>(List.of(f1, f2)));

        when(formTemplateRepository.findById(10L)).thenReturn(Optional.of(templateV1));
        when(formTemplateRepository.findFirstByCompanyIdAndCategoryIdOrderByVersionDesc(1L, 100L))
                .thenReturn(Optional.of(templateV1));

        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> {
            FormTemplate ft = inv.getArgument(0);
            if (ft.getId() == null) {
                ft.setId(11L);
            }
            return ft;
        });

        FormTemplateRequest updateReq = new FormTemplateRequest();
        updateReq.setCategoryId(100L);
        updateReq.setName("Hardware Form Updated");
        updateReq.setDescription("Updated form with problemType");

        FormFieldDto f1Dto = new FormFieldDto();
        f1Dto.setFieldKey("deviceType");
        f1Dto.setLabel("Device Type");
        f1Dto.setFieldType("TEXT");

        FormFieldDto f2Dto = new FormFieldDto();
        f2Dto.setFieldKey("serialNumber");
        f2Dto.setLabel("Serial Number");
        f2Dto.setFieldType("TEXT");

        FormFieldDto f3Dto = new FormFieldDto();
        f3Dto.setFieldKey("problemType");
        f3Dto.setLabel("Problem Type");
        f3Dto.setFieldType("TEXT");

        updateReq.setFields(List.of(f1Dto, f2Dto, f3Dto));

        FormTemplateResponse v2Response = formTemplateService.updateFormTemplate(10L, updateReq, 1L, Role.COMPANY_ADMIN);

        assertNotNull(v2Response);
        assertEquals(11L, v2Response.getId());
        assertEquals(2, v2Response.getVersion());

        // Verify Version 1 template was archived and fields were NOT cleared/deleted
        assertEquals("ARCHIVED", templateV1.getStatus());
        assertEquals(2, templateV1.getFields().size());
        assertEquals("deviceType", templateV1.getFields().get(0).getFieldKey());
        assertEquals("serialNumber", templateV1.getFields().get(1).getFieldKey());
    }

    @Test
    @DisplayName("Test 4 — Old Ticket: References Version 1 and historic form values survive after Version 2 is created")
    void test4_OldTicketReferencesVersion1() {
        FormTemplate templateV1 = new FormTemplate();
        templateV1.setId(10L);
        templateV1.setCompany(companyA);
        templateV1.setCategory(categoryHardware);
        templateV1.setVersion(1);
        templateV1.setStatus("ARCHIVED");

        FormField f1 = new FormField(101L, templateV1, "TEXT", "Device Type", "deviceType", "", true, 0, null, null, new ArrayList<>(), null, null);
        FormField f2 = new FormField(102L, templateV1, "TEXT", "Serial Number", "serialNumber", "", true, 1, null, null, new ArrayList<>(), null, null);
        templateV1.setFields(List.of(f1, f2));

        Ticket ticket100 = new Ticket();
        ticket100.setId(100L);
        ticket100.setTicketNumber("#ACME-100");
        ticket100.setCompany(companyA);
        ticket100.setCategory(categoryHardware);
        ticket100.setFormTemplate(templateV1);

        FormSubmissionValue sub1 = new FormSubmissionValue(ticket100, f2, "ABC123");

        assertEquals(10L, ticket100.getFormTemplate().getId());
        assertEquals(1, ticket100.getFormTemplate().getVersion());
        assertEquals("serialNumber", sub1.getField().getFieldKey());
        assertEquals("ABC123", sub1.getValue());
    }

    @Test
    @DisplayName("Test 5 — New Ticket: Uses Version 2 when created after form update")
    void test5_NewTicketUsesVersion2() {
        FormTemplate templateV2 = new FormTemplate();
        templateV2.setId(11L);
        templateV2.setCompany(companyA);
        templateV2.setCategory(categoryHardware);
        templateV2.setName("Hardware Form V2");
        templateV2.setVersion(2);
        templateV2.setStatus("ACTIVE");

        FormField f1 = new FormField(201L, templateV2, "TEXT", "Device Type", "deviceType", "", true, 0, null, null, new ArrayList<>(), null, null);
        FormField f2 = new FormField(202L, templateV2, "TEXT", "Serial Number", "serialNumber", "", true, 1, null, null, new ArrayList<>(), null, null);
        FormField f3 = new FormField(203L, templateV2, "TEXT", "Problem Type", "problemType", "", false, 2, null, null, new ArrayList<>(), null, null);
        templateV2.setFields(List.of(f1, f2, f3));

        when(categoryService.getCategoryById(100L)).thenReturn(categoryHardware);
        when(formTemplateRepository.findFirstByCompanyIdAndCategoryIdAndStatusOrderByVersionDesc(1L, 100L, "ACTIVE"))
                .thenReturn(Optional.of(templateV2));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> {
            Ticket t = inv.getArgument(0);
            t.setId(101L);
            t.setTicketNumber("#ACME-101");
            return t;
        });

        TicketRequest request = new TicketRequest();
        request.setSubject("New Laptop Ticket");
        request.setCategoryId(100L);
        Map<String, Object> formValues = new LinkedHashMap<>();
        formValues.put("deviceType", "Laptop");
        formValues.put("serialNumber", "XYZ999");
        formValues.put("problemType", "Screen Damage");
        request.setFormValues(formValues);

        Ticket created = ticketService.createTicket(request, companyA, creator);

        assertNotNull(created);
        assertEquals(11L, created.getFormTemplate().getId());
        assertEquals(2, created.getFormTemplate().getVersion());

        ArgumentCaptor<FormSubmissionValue> captor = ArgumentCaptor.forClass(FormSubmissionValue.class);
        verify(formSubmissionValueRepository, times(3)).save(captor.capture());
        List<FormSubmissionValue> savedValues = captor.getAllValues();
        assertEquals(3, savedValues.size());
    }

    @Test
    @DisplayName("Test 6 — Historical Fields: Version 1 fields must not be deleted when Version 2 is created")
    void test6_HistoricalFieldsNotDeleted() {
        FormTemplate v1 = new FormTemplate();
        v1.setId(10L);
        v1.setCompany(companyA);
        v1.setCategory(categoryHardware);
        v1.setVersion(1);
        v1.setStatus("ACTIVE");

        FormField field1 = new FormField(101L, v1, "TEXT", "Field 1", "f1", "", false, 0, null, null, new ArrayList<>(), null, null);
        v1.setFields(new ArrayList<>(List.of(field1)));

        when(formTemplateRepository.findById(10L)).thenReturn(Optional.of(v1));
        when(formTemplateRepository.findFirstByCompanyIdAndCategoryIdOrderByVersionDesc(1L, 100L)).thenReturn(Optional.of(v1));
        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        FormTemplateRequest updateReq = new FormTemplateRequest();
        updateReq.setCategoryId(100L);
        updateReq.setName("New Form");
        FormFieldDto f2Dto = new FormFieldDto();
        f2Dto.setFieldKey("f2");
        f2Dto.setLabel("Field 2");
        updateReq.setFields(List.of(f2Dto));

        formTemplateService.updateFormTemplate(10L, updateReq, 1L, Role.COMPANY_ADMIN);

        // Version 1 fields list must still contain field1
        assertFalse(v1.getFields().isEmpty());
        assertEquals("f1", v1.getFields().get(0).getFieldKey());
        assertEquals(101L, v1.getFields().get(0).getId());
    }

    @Test
    @DisplayName("Test 7 — Prevent Deletion: Reject deletion of FormTemplate referenced by tickets and archive it")
    void test7_DeleteReferencedFormTemplate_ByTickets_ThrowsExceptionAndArchives() {
        FormTemplate template = new FormTemplate();
        template.setId(10L);
        template.setCompany(companyA);
        template.setStatus("ACTIVE");

        when(formTemplateRepository.findById(10L)).thenReturn(Optional.of(template));
        when(ticketRepository.existsByFormTemplateId(10L)).thenReturn(true);
        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            formTemplateService.deleteFormTemplate(10L, 1L, Role.COMPANY_ADMIN);
        });

        assertTrue(ex.getMessage().contains("referenced by existing tickets"));
        assertEquals("ARCHIVED", template.getStatus());
        verify(formTemplateRepository).save(template);
        verify(formTemplateRepository, never()).delete(any(FormTemplate.class));
    }

    @Test
    @DisplayName("Test 8 — Prevent Deletion: Reject deletion of FormTemplate referenced by submissions and archive it")
    void test8_DeleteReferencedFormTemplate_BySubmissions_ThrowsExceptionAndArchives() {
        FormTemplate template = new FormTemplate();
        template.setId(10L);
        template.setCompany(companyA);
        template.setStatus("ACTIVE");

        when(formTemplateRepository.findById(10L)).thenReturn(Optional.of(template));
        when(ticketRepository.existsByFormTemplateId(10L)).thenReturn(false);
        when(formSubmissionValueRepository.existsByFieldFormTemplateId(10L)).thenReturn(true);
        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        IllegalStateException ex = assertThrows(IllegalStateException.class, () -> {
            formTemplateService.deleteFormTemplate(10L, 1L, Role.COMPANY_ADMIN);
        });

        assertTrue(ex.getMessage().contains("historical submissions"));
        assertEquals("ARCHIVED", template.getStatus());
        verify(formTemplateRepository).save(template);
        verify(formTemplateRepository, never()).delete(any(FormTemplate.class));
    }

    @Test
    @DisplayName("Test 9 — Soft Delete: Unreferenced form template is archived without physical deletion")
    void test9_DeleteUnreferencedFormTemplate_SoftDeletesByArchivingWithoutPhysicalDelete() {
        FormTemplate template = new FormTemplate();
        template.setId(10L);
        template.setCompany(companyA);
        template.setStatus("ACTIVE");

        when(formTemplateRepository.findById(10L)).thenReturn(Optional.of(template));
        when(ticketRepository.existsByFormTemplateId(10L)).thenReturn(false);
        when(formSubmissionValueRepository.existsByFieldFormTemplateId(10L)).thenReturn(false);
        when(formTemplateRepository.save(any(FormTemplate.class))).thenAnswer(inv -> inv.getArgument(0));

        formTemplateService.deleteFormTemplate(10L, 1L, Role.COMPANY_ADMIN);

        assertEquals("ARCHIVED", template.getStatus());
        verify(formTemplateRepository).save(template);
        verify(formTemplateRepository, never()).delete(any(FormTemplate.class));
    }

    @Test
    @DisplayName("Test 10 — Preserved FormSubmissionValue: Cleared dynamic value updates record to empty string instead of physical deletion")
    void test10_ClearedFormSubmissionValue_PreservesRowWithEmptyString() {
        Ticket ticket = new Ticket();
        ticket.setId(100L);
        ticket.setCompany(companyA);
        ticket.setCreatedBy(creator);
        ticket.setCategory(categoryHardware);

        FormTemplate v1 = new FormTemplate();
        v1.setId(10L);
        v1.setCompany(companyA);
        v1.setVersion(1);
        ticket.setFormTemplate(v1);

        FormField f1 = new FormField(101L, v1, "TEXT", "Notes", "notes", "", false, 0, null, null, new ArrayList<>(), null, null);
        v1.setFields(List.of(f1));

        FormSubmissionValue existingVal = new FormSubmissionValue(ticket, f1, "Initial Note");

        when(ticketRepository.findById(100L)).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any(Ticket.class))).thenAnswer(inv -> inv.getArgument(0));
        when(formSubmissionValueRepository.findByTicketIdAndFieldId(100L, 101L)).thenReturn(Optional.of(existingVal));

        TicketRequest request = new TicketRequest();
        Map<String, Object> formValues = new HashMap<>();
        formValues.put("notes", ""); // User clears the field
        request.setFormValues(formValues);

        ticketService.updateTicket(100L, request, 1L, Role.COMPANY_ADMIN, 10L);

        assertEquals("", existingVal.getValue());
        verify(formSubmissionValueRepository).save(existingVal);
        verify(formSubmissionValueRepository, never()).delete(any(FormSubmissionValue.class));
    }
}
