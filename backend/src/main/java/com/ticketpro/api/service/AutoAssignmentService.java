package com.ticketpro.api.service;

import com.ticketpro.api.entity.Category;
import com.ticketpro.api.entity.Company;
import com.ticketpro.api.entity.Department;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.repository.DepartmentRepository;
import com.ticketpro.api.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Enterprise Smart Auto-Assignment Service
 * Employs the Least-Loaded Algorithm with Round-Robin tiebreaking
 * to balance workloads and accelerate ticket resolution SLAs.
 */
@Service
@Slf4j
public class AutoAssignmentService {

    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    public AutoAssignmentService(UserRepository userRepository, DepartmentRepository departmentRepository) {
        this.userRepository = userRepository;
        this.departmentRepository = departmentRepository;
    }

    /**
     * Resolves the proper department from explicit input or ticket category.
     */
    public String resolveDepartment(String explicitDepartment, Category category, Long companyId) {
        if (explicitDepartment != null && !explicitDepartment.trim().isBlank()
                && !explicitDepartment.equalsIgnoreCase("Customer Support")
                && !explicitDepartment.equalsIgnoreCase("General Support")) {
            return explicitDepartment.trim();
        }

        if (category == null || category.getName() == null) {
            return (explicitDepartment != null && !explicitDepartment.trim().isBlank()) ? explicitDepartment.trim() : "General Support";
        }

        String catName = category.getName().toLowerCase();

        // 1. Check matching company departments from database first
        if (companyId != null) {
            try {
                List<Department> companyDepts = departmentRepository.findByCompanyId(companyId);
                // 1a. Check department name
                for (Department d : companyDepts) {
                    if (d.getName() != null) {
                        String dName = d.getName().toLowerCase();
                        if (catName.contains(dName) || dName.contains(catName)) {
                            return d.getName();
                        }
                    }
                }
                // 1b. Check department description (which often lists forms/categories like "User Management")
                for (Department d : companyDepts) {
                    if (d.getDescription() != null && d.getName() != null) {
                        String dDesc = d.getDescription().toLowerCase();
                        if (dDesc.contains(catName) || catName.contains(dDesc)) {
                            return d.getName();
                        }
                    }
                }
                // 1c. IT / User / Tech department match
                if (catName.contains("user") || catName.contains("it") || catName.contains("infra") || 
                    catName.contains("tech") || catName.contains("system") || catName.contains("account") ||
                    catName.contains("login") || catName.contains("password") || catName.contains("portal") ||
                    catName.contains("software") || catName.contains("hardware")) {
                    for (Department d : companyDepts) {
                        if (d.getName() != null && (d.getName().toLowerCase().contains("it") || d.getName().toLowerCase().contains("infra"))) {
                            return d.getName();
                        }
                    }
                }
                // 1d. Fleet / Vehicle / Tracking department match
                if (catName.contains("vehicle") || catName.contains("fleet") || catName.contains("track") || 
                    catName.contains("route") || catName.contains("geofence") || catName.contains("tanker") || catName.contains("driver")) {
                    for (Department d : companyDepts) {
                        if (d.getName() != null && (d.getName().toLowerCase().contains("fleet") || d.getName().toLowerCase().contains("telematics") || d.getName().toLowerCase().contains("ops"))) {
                            return d.getName();
                        }
                    }
                }
                // 1e. IoT / Hardware / Device department match
                if (catName.contains("hardware") || catName.contains("iot") || catName.contains("device") || 
                    catName.contains("sensor") || catName.contains("gps") || catName.contains("battery")) {
                    for (Department d : companyDepts) {
                        if (d.getName() != null && (d.getName().toLowerCase().contains("iot") || d.getName().toLowerCase().contains("hardware") || d.getName().toLowerCase().contains("engineering"))) {
                            return d.getName();
                        }
                    }
                }
                // 1f. Supply Chain / Plant / Terminal / Fuel department match
                if (catName.contains("supply") || catName.contains("chain") || catName.contains("terminal") || 
                    catName.contains("plant") || catName.contains("fuel") || catName.contains("distributor") || catName.contains("toll")) {
                    for (Department d : companyDepts) {
                        if (d.getName() != null && (d.getName().toLowerCase().contains("supply") || d.getName().toLowerCase().contains("terminal") || d.getName().toLowerCase().contains("scm"))) {
                            return d.getName();
                        }
                    }
                }
            } catch (Exception e) {
                log.debug("Error querying company departments: {}", e.getMessage());
            }
        }

        // 2. Standard Industry Keyword Mapping
        if (catName.contains("it") || catName.contains("user") || catName.contains("account") || 
            catName.contains("identity") || catName.contains("login") || catName.contains("password") ||
            catName.contains("hardware") || catName.contains("software") || 
            catName.contains("network") || catName.contains("laptop") || catName.contains("system") || 
            catName.contains("vpn") || catName.contains("server") || catName.contains("bug") ||
            catName.contains("tech") || catName.contains("access") || catName.contains("portal")) {
            return "IT & Infrastructure";
        }

        if (catName.contains("hr") || catName.contains("salary") || catName.contains("payroll") || 
            catName.contains("leave") || catName.contains("holiday") || catName.contains("onboard") || 
            catName.contains("attendance") || catName.contains("people") || catName.contains("kyc")) {
            return "Human Resources";
        }

        if (catName.contains("billing") || catName.contains("invoice") || catName.contains("payment") || 
            catName.contains("finance") || catName.contains("card") || catName.contains("tax") || 
            catName.contains("reimburse") || catName.contains("loan")) {
            return "Finance & Billing";
        }

        if (catName.contains("facility") || catName.contains("facilities") || catName.contains("office") || 
            catName.contains("desk") || catName.contains("maintenance")) {
            return "Facilities & Admin";
        }

        if (catName.contains("legal") || catName.contains("compliance") || catName.contains("contract")) {
            return "Legal & Compliance";
        }

        return (explicitDepartment != null && !explicitDepartment.trim().isBlank()) ? explicitDepartment.trim() : category.getName();
    }

    /**
     * Automatically assigns the best agent for a ticket using Least-Loaded logic.
     */
    public User assignBestAgent(Company company, String department, Category category) {
        if (company == null || company.getId() == null) {
            log.warn("Auto-assignment skipped: Company is null");
            return null;
        }

        String targetDepartment = resolveDepartment(department, category, company.getId());

        // 1. Find least loaded agent strictly within the target department
        try {
            List<User> deptAgents = userRepository.findLeastLoadedAgentsByDepartment(company.getId(), targetDepartment);
            if (deptAgents != null && !deptAgents.isEmpty()) {
                User bestAgent = deptAgents.get(0);
                log.info("🎯 [Auto-Assignment]: Assigned to least-loaded agent '{}' ({}) in Department '{}' for Company '{}'",
                        bestAgent.getName(), bestAgent.getEmail(), targetDepartment, company.getCompanyName());
                return bestAgent;
            }
        } catch (Exception e) {
            log.warn("Error finding least-loaded agents by department: {}", e.getMessage());
        }

        // Strict Department Boundary:
        // If no agent exists in this specific department, DO NOT cross-assign to an unrelated department!
        // Leave the ticket unassigned with status OPEN so the admin can assign or add staff for this department.
        log.info("⚠️ [Auto-Assignment]: No agent found in department '{}' for Company '{}'. Ticket remains Unassigned (OPEN).",
                targetDepartment, company.getCompanyName());
        return null;
    }
}
