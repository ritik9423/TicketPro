package com.ticketpro.api.security;

import com.ticketpro.api.entity.User;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.CompanyStatus;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

public class CustomUserDetails implements UserDetails {

    private final User user;

    public CustomUserDetails(User user) {
        this.user = user;
    }

    public User getUser() {
        return user;
    }

    public Long getId() {
        return user.getId();
    }

    public Role getRole() {
        return user.getRole();
    }

    public Long getCompanyId() {
        return user.getCompany() != null ? user.getCompany().getId() : null;
    }

    public String getCompanyCode() {
        return user.getCompany() != null ? user.getCompany().getCompanyCode() : null;
    }

    public String getEmail() {
        return user.getEmail();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public String getPassword() {
        return user.getPassword();
    }

    @Override
    public String getUsername() {
        return user.getEmail();
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        if (user.getStatus() == com.ticketpro.api.entity.UserStatus.BLOCKED) {
            return false;
        }
        // SECURITY M-3: Lock accounts belonging to suspended companies
        if (user.getRole() != Role.SUPER_ADMIN && user.getCompany() != null) {
            if (user.getCompany().getStatus() == CompanyStatus.SUSPENDED) {
                return false;
            }
        }
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        if (user.getStatus() != com.ticketpro.api.entity.UserStatus.ACTIVE) {
            return false;
        }
        // SECURITY M-3: Disable accounts if company is not ACTIVE
        if (user.getRole() != Role.SUPER_ADMIN && user.getCompany() != null) {
            return user.getCompany().getStatus() == CompanyStatus.ACTIVE;
        }
        return true;
    }
}
