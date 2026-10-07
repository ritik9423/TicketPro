package com.ticketpro.api.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AgentScorecardDto {
    private Long agentId;
    private String agentName;
    private String agentEmail;
    private String department;
    private Long totalRatings;
    private Double averageRating;
    private Double satisfactionRatePercentage; // % of 4 and 5 stars
    private Long fiveStarCount;
    private Long fourStarCount;
    private Long threeStarCount;
    private Long twoStarCount;
    private Long oneStarCount;
    private String badge; // "Top Performer", "Customer Favorite", "Speed Champion", etc.
}
