package com.ticketpro.api.dto;

import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.util.List;
import java.util.Map;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CsatStatsResponse {
    private Double averageRating;
    private Long totalResponses;
    private Double satisfactionRatePercentage; // Percentage of 4 and 5 star ratings
    private Map<Integer, Long> ratingDistribution; // 1 -> count, 2 -> count, ... 5 -> count
    private List<FeedbackResponse> recentFeedbacks;
    private List<AgentScorecardDto> agentScorecards;
}
