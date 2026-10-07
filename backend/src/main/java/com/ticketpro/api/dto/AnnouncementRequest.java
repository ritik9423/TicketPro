package com.ticketpro.api.dto;

import com.ticketpro.api.entity.AnnouncementStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AnnouncementRequest {

    @NotBlank(message = "Title is required")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @NotBlank(message = "Message content is required")
    private String message;

    private AnnouncementStatus status;

    private Long targetCompanyId; // Optional: allowed only for SUPER_ADMIN
}
