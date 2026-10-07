package com.ticketpro.api.service;

import com.ticketpro.api.dto.UserRequest;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.UserStatus;
import com.ticketpro.api.repository.NotificationRepository;
import com.ticketpro.api.repository.TicketRepository;
import com.ticketpro.api.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServicePasswordUpdateTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private TicketRepository ticketRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private UserService userService;

    private Company company1;
    private User agentUser;

    @BeforeEach
    void setUp() {
        userService = new UserService(
                userRepository,
                ticketRepository,
                notificationRepository,
                passwordEncoder
        );

        company1 = new Company();
        company1.setId(10L);
        company1.setCompanyName("Company 1");

        agentUser = new User();
        agentUser.setId(27L);
        agentUser.setName("Agent User");
        agentUser.setEmail("agent@company1.com");
        agentUser.setPassword("OldHashedPassword");
        agentUser.setRole(Role.AGENT);
        agentUser.setStatus(UserStatus.ACTIVE);
        agentUser.setCompany(company1);

        when(userRepository.findById(27L)).thenReturn(Optional.of(agentUser));
        lenient().when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "encoded_" + invocation.getArgument(0));
    }

    @Test
    @DisplayName("Company Admin can update password of an agent in their own company")
    void companyAdmin_canUpdateAgentPassword_inOwnCompany() {
        UserRequest request = new UserRequest();
        request.setName("Agent User Updated");
        request.setPassword("NewSecurePass@123");

        User updated = userService.updateUser(27L, request, 10L, Role.COMPANY_ADMIN, 25L);

        assertNotNull(updated);
        assertEquals("encoded_NewSecurePass@123", updated.getPassword());
        verify(passwordEncoder).encode("NewSecurePass@123");
        verify(userRepository).save(agentUser);
    }

    @Test
    @DisplayName("Super Admin can update password of any tenant user")
    void superAdmin_canUpdateUserPassword() {
        UserRequest request = new UserRequest();
        request.setPassword("SuperReset@456");

        User updated = userService.updateUser(27L, request, null, Role.SUPER_ADMIN, 1L);

        assertNotNull(updated);
        assertEquals("encoded_SuperReset@456", updated.getPassword());
        verify(passwordEncoder).encode("SuperReset@456");
    }

    @Test
    @DisplayName("Account owner can update their own password")
    void accountOwner_canUpdateOwnPassword() {
        UserRequest request = new UserRequest();
        request.setPassword("SelfReset@789");

        User updated = userService.updateUser(27L, request, 10L, Role.AGENT, 27L);

        assertNotNull(updated);
        assertEquals("encoded_SelfReset@789", updated.getPassword());
        verify(passwordEncoder).encode("SelfReset@789");
    }

    @Test
    @DisplayName("Company Admin cannot update user outside their company")
    void companyAdmin_cannotUpdateUser_inOtherCompany() {
        UserRequest request = new UserRequest();
        request.setPassword("NewPass@123");

        SecurityException ex = assertThrows(SecurityException.class, () ->
                userService.updateUser(27L, request, 20L, Role.COMPANY_ADMIN, 99L)
        );
        assertTrue(ex.getMessage().contains("Unauthorized to update user outside your company"));
    }

    @Test
    @DisplayName("Regular Agent cannot update another user's password")
    void regularAgent_cannotUpdateAnotherUserPassword() {
        UserRequest request = new UserRequest();
        request.setPassword("HackerPass@123");

        SecurityException ex = assertThrows(SecurityException.class, () ->
                userService.updateUser(27L, request, 10L, Role.AGENT, 28L)
        );
        assertTrue(ex.getMessage().contains("Cannot change another user's password"));
    }
}
