package com.ticketpro.api.specification;

import com.ticketpro.api.entity.Priority;
import com.ticketpro.api.entity.Ticket;
import com.ticketpro.api.entity.TicketStatus;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class TicketSpecification {

    public static Specification<Ticket> filterTickets(
            Long companyId,
            String search,
            List<TicketStatus> statuses,
            List<Priority> priorities,
            String department,
            Long assignedToId,
            Long createdById,
            LocalDateTime startDate,
            LocalDateTime endDate,
            Boolean slaBreached
    ) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // 1. Company Multi-Tenant Scoping
            if (companyId != null) {
                predicates.add(cb.equal(root.get("company").get("id"), companyId));
            }

            // 2. Full-Text / Keyword Search (Subject, Description, TicketNumber, Creator Name, Creator Email)
            if (search != null && !search.trim().isEmpty()) {
                String pattern = "%" + search.trim().toLowerCase() + "%";
                Predicate searchPred = cb.or(
                        cb.like(cb.lower(root.get("subject")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern),
                        cb.like(cb.lower(root.get("ticketNumber")), pattern),
                        cb.like(cb.lower(root.get("createdBy").get("name")), pattern),
                        cb.like(cb.lower(root.get("createdBy").get("email")), pattern)
                );
                predicates.add(searchPred);
            }

            // 3. Status Filters (Multi-Status support)
            if (statuses != null && !statuses.isEmpty()) {
                predicates.add(root.get("status").in(statuses));
            }

            // 4. Priority Filters (Multi-Priority support)
            if (priorities != null && !priorities.isEmpty()) {
                predicates.add(root.get("priority").in(priorities));
            }

            // 5. Department Filter
            if (department != null && !department.trim().isEmpty()) {
                predicates.add(cb.equal(cb.lower(root.get("department")), department.trim().toLowerCase()));
            }

            // 6. Assigned Agent Filter
            if (assignedToId != null) {
                if (assignedToId == -1L) {
                    // Filter unassigned
                    predicates.add(cb.isNull(root.get("assignedTo")));
                } else {
                    predicates.add(cb.equal(root.get("assignedTo").get("id"), assignedToId));
                }
            }

            // 7. Created By Customer / User Filter
            if (createdById != null) {
                predicates.add(cb.equal(root.get("createdBy").get("id"), createdById));
            }

            // 8. Date Range Filters (createdAt)
            if (startDate != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), startDate));
            }
            if (endDate != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), endDate));
            }

            // 9. SLA Breach Filter
            if (slaBreached != null) {
                predicates.add(cb.equal(root.get("slaBreached"), slaBreached));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
