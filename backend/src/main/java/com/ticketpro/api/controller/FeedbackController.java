package com.ticketpro.api.controller;

import com.ticketpro.api.dto.CsatStatsResponse;
import com.ticketpro.api.dto.FeedbackRequest;
import com.ticketpro.api.dto.FeedbackResponse;
import com.ticketpro.api.entity.Role;
import com.ticketpro.api.entity.User;
import com.ticketpro.api.security.CustomUserDetails;
import com.ticketpro.api.service.FeedbackService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FeedbackController {

    private final FeedbackService feedbackService;

    @Value("${ticketpro.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public FeedbackController(FeedbackService feedbackService) {
        this.feedbackService = feedbackService;
    }

    /**
     * Submit CSAT rating & feedback for a specific ticket (In-App Authenticated)
     */
    @PostMapping("/tickets/{ticketId}/feedback")
    public ResponseEntity<FeedbackResponse> submitFeedback(
            @PathVariable("ticketId") Long ticketId,
            @Valid @RequestBody FeedbackRequest request,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        User currentUser = userDetails != null ? userDetails.getUser() : null;
        FeedbackResponse response = feedbackService.submitFeedback(ticketId, request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Public 1-Click Email Rating Landing Endpoint.
     * Records rating immediately and returns a responsive confirmation page.
     */
    @GetMapping(value = "/public/feedback/rate", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> rateFromEmail(
            @RequestParam("ticketId") Long ticketId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "tags", required = false) String tags) {

        try {
            FeedbackResponse response = feedbackService.submitEmailRating(ticketId, rating, comment, tags, token);
            String html = generateRatingSuccessHtml(response, rating, token);
            return ResponseEntity.ok(html);
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(generateErrorHtml("Security Verification Failed", e.getMessage()));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(generateErrorHtml("Feedback Request Notice", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(generateErrorHtml("System Notice", "We encountered an unexpected error processing your rating."));
        }
    }

    /**
     * Public JSON endpoint for headless or frontend-based rating submissions
     */
    @PostMapping("/public/feedback/rate")
    public ResponseEntity<FeedbackResponse> submitPublicRatingJson(
            @RequestParam("ticketId") Long ticketId,
            @RequestParam("rating") Integer rating,
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "tags", required = false) String tags) {
        FeedbackResponse response = feedbackService.submitEmailRating(ticketId, rating, comment, tags, token);
        return ResponseEntity.ok(response);
    }

    /**
     * Updates optional comment and tags submitted via the email confirmation landing page.
     */
    @PostMapping(value = "/public/feedback/comment", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> submitEmailComment(
            @RequestParam("ticketId") Long ticketId,
            @RequestParam(value = "token", required = false) String token,
            @RequestParam(value = "comment", required = false) String comment,
            @RequestParam(value = "tags", required = false) String tags) {

        try {
            FeedbackResponse response = feedbackService.updateFeedbackComment(ticketId, comment, tags, token);
            String html = generateRatingSuccessHtml(response, response.getRating(), token, true);
            return ResponseEntity.ok(html);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(generateErrorHtml("Comment Submission Notice", e.getMessage()));
        }
    }

    /**
     * Get submitted feedback for a specific ticket — requires authentication and tenant verification (H-3).
     */
    @GetMapping("/tickets/{ticketId}/feedback")
    public ResponseEntity<FeedbackResponse> getFeedbackByTicket(
            @PathVariable("ticketId") Long ticketId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {
        if (userDetails == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        FeedbackResponse feedback = feedbackService.getFeedbackByTicketId(
                ticketId, userDetails.getCompanyId(), userDetails.getRole(), userDetails.getId());
        if (feedback == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(feedback);
    }

    /**
     * Get CSAT statistics (Avg Score, % satisfaction, star distribution)
     */
    @GetMapping("/feedback/stats")
    public ResponseEntity<CsatStatsResponse> getCsatStats(
            @RequestParam(value = "companyId", required = false) Long companyId,
            @AuthenticationPrincipal CustomUserDetails userDetails) {

        if (userDetails == null) {
            throw new SecurityException("Authentication required to access feedback statistics.");
        }

        if (userDetails.getRole() == Role.END_USER) {
            Map<Integer, Long> emptyDist = new HashMap<>();
            for (int i = 1; i <= 5; i++) emptyDist.put(i, 0L);
            CsatStatsResponse defaultStats = CsatStatsResponse.builder()
                    .averageRating(5.0)
                    .totalResponses(0L)
                    .satisfactionRatePercentage(100.0)
                    .ratingDistribution(emptyDist)
                    .recentFeedbacks(Collections.emptyList())
                    .agentScorecards(Collections.emptyList())
                    .build();
            return ResponseEntity.ok(defaultStats);
        }

        Long targetCompanyId = userDetails.getRole() == Role.SUPER_ADMIN ? companyId : userDetails.getCompanyId();
        CsatStatsResponse stats = feedbackService.getCsatStats(targetCompanyId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get list of recent CSAT reviews
     */
    @GetMapping("/feedback")
    public ResponseEntity<?> getAllFeedback(
            @RequestParam(value = "companyId", required = false) Long companyId,
            @RequestParam(value = "page", required = false) Integer page,
            @RequestParam(value = "size", required = false) Integer size,
            @AuthenticationPrincipal CustomUserDetails userDetails,
            org.springframework.data.domain.Pageable pageable) {

        if (userDetails == null) {
            throw new SecurityException("Authentication required to access feedback reviews.");
        }

        if (userDetails.getRole() == Role.END_USER) {
            return ResponseEntity.ok(Collections.emptyList());
        }

        Long targetCompanyId = userDetails.getRole() == Role.SUPER_ADMIN ? companyId : userDetails.getCompanyId();

        int pageNum = page != null ? page : 0;
        int pageSize = Math.min(size != null ? size : 20, 100);
        org.springframework.data.domain.Pageable paged = org.springframework.data.domain.PageRequest.of(pageNum, pageSize, pageable.getSort());
        org.springframework.data.domain.Page<FeedbackResponse> fbPage = feedbackService.getFeedbackByCompanyPaged(targetCompanyId, paged);
        return ResponseEntity.ok(com.ticketpro.api.dto.PagedResponse.from(fbPage));
    }

    private String generateRatingSuccessHtml(FeedbackResponse response, Integer rating, String token) {
        return generateRatingSuccessHtml(response, rating, token, false);
    }

    private String generateRatingSuccessHtml(FeedbackResponse response, Integer rating, String token, boolean commentSaved) {
        String ticketNum = response.getTicketNumber() != null ? response.getTicketNumber() : ("#" + response.getTicketId());
        String ticketSubj = response.getTicketSubject() != null ? response.getTicketSubject() : "Support Request";
        String agent = response.getAgentName() != null ? response.getAgentName() : "Support Agent";
        String customer = response.getCustomerName() != null ? response.getCustomerName() : "Valued Customer";
        String company = response.getCompanyName() != null ? response.getCompanyName() : "TicketPro";
        String currentComment = response.getFeedback() != null ? response.getFeedback() : "";

        StringBuilder starDisplay = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            if (i <= rating) {
                starDisplay.append("<span style=\"color: #f59e0b; font-size: 32px;\">&#9733;</span>");
            } else {
                starDisplay.append("<span style=\"color: #cbd5e1; font-size: 32px;\">&#9733;</span>");
            }
        }

        String ratingLabel = switch (rating) {
            case 5 -> "🌟 5/5 &mdash; Outstanding & Exceptional Support!";
            case 4 -> "😊 4/5 &mdash; Very Good & Helpful Experience";
            case 3 -> "😐 3/5 &mdash; Satisfactory Support";
            case 2 -> "🙁 2/5 &mdash; Below Expectations";
            default -> "😞 1/5 &mdash; Needs Significant Improvement";
        };

        String portalLink = frontendUrl + "/tickets/" + response.getTicketId();

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Rating Recorded &bull; %s Helpdesk</title>
                <style>
                    * { box-sizing: border-box; margin: 0; padding: 0; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        background: #f8fafc;
                        color: #0f172a;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 24px;
                    }
                    .card {
                        background: #ffffff;
                        max-width: 580px;
                        width: 100%%;
                        border-radius: 24px;
                        box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.07), 0 0 0 1px #e2e8f0;
                        overflow: hidden;
                        text-align: left;
                    }
                    .header {
                        background: linear-gradient(135deg, #1e1b4b 0%%, #312e81 45%%, #4338ca 100%%);
                        padding: 28px 32px;
                        color: #ffffff;
                    }
                    .brand {
                        display: inline-flex;
                        align-items: center;
                        gap: 8px;
                        background: rgba(255, 255, 255, 0.15);
                        padding: 4px 12px;
                        border-radius: 100px;
                        font-size: 11px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .header h1 {
                        font-size: 22px;
                        font-weight: 800;
                        margin-top: 12px;
                    }
                    .content {
                        padding: 32px;
                    }
                    .success-pill {
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        background: #ecfdf5;
                        color: #065f46;
                        border: 1px solid #a7f3d0;
                        padding: 6px 14px;
                        border-radius: 100px;
                        font-size: 12px;
                        font-weight: 800;
                        margin-bottom: 20px;
                    }
                    .stars-wrap {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        margin-bottom: 8px;
                    }
                    .rating-text {
                        font-size: 15px;
                        font-weight: 800;
                        color: #1e293b;
                        margin-bottom: 20px;
                    }
                    .ticket-box {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 18px 20px;
                        margin-bottom: 24px;
                        font-size: 13px;
                    }
                    .ticket-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 4px 0;
                    }
                    .ticket-label {
                        color: #64748b;
                        font-weight: 600;
                    }
                    .ticket-val {
                        color: #0f172a;
                        font-weight: 700;
                    }
                    .comment-form {
                        background: #f1f5f9;
                        border-radius: 16px;
                        padding: 20px;
                        margin-bottom: 24px;
                    }
                    .comment-form label {
                        display: block;
                        font-size: 12px;
                        font-weight: 800;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        color: #475569;
                        margin-bottom: 8px;
                    }
                    .tag-chips {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 6px;
                        margin-bottom: 12px;
                    }
                    .chip-btn {
                        background: #ffffff;
                        border: 1px solid #cbd5e1;
                        padding: 6px 12px;
                        border-radius: 8px;
                        font-size: 12px;
                        font-weight: 700;
                        color: #334155;
                        cursor: pointer;
                        transition: all 0.2s;
                    }
                    .chip-btn:hover {
                        border-color: #6366f1;
                        color: #4f46e5;
                    }
                    textarea {
                        width: 100%%;
                        min-height: 80px;
                        border-radius: 12px;
                        border: 1px solid #cbd5e1;
                        padding: 12px;
                        font-family: inherit;
                        font-size: 13px;
                        outline: none;
                        resize: vertical;
                        margin-bottom: 12px;
                    }
                    textarea:focus {
                        border-color: #4f46e5;
                        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
                    }
                    .btn-submit {
                        background: #4f46e5;
                        color: #ffffff;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 10px;
                        font-size: 13px;
                        font-weight: 700;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .btn-submit:hover {
                        background: #4338ca;
                    }
                    .btn-portal {
                        display: inline-block;
                        background: #0f172a;
                        color: #ffffff;
                        padding: 12px 24px;
                        border-radius: 12px;
                        font-size: 13px;
                        font-weight: 800;
                        text-decoration: none;
                        text-align: center;
                        transition: background 0.2s;
                    }
                    .btn-portal:hover {
                        background: #1e293b;
                    }
                    .footer {
                        border-top: 1px solid #f1f5f9;
                        padding: 16px 32px;
                        text-align: center;
                        font-size: 11px;
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="header">
                        <div class="brand">
                            <span>&#9889;</span> %s Enterprise Helpdesk
                        </div>
                        <h1>Thank You, %s!</h1>
                    </div>
                    <div class="content">
                        <div class="success-pill">
                            <span>&#10003;</span> Rating Recorded in Real Time
                        </div>

                        <div class="stars-wrap">
                            %s
                        </div>
                        <div class="rating-text">%s</div>

                        %s

                        <div class="ticket-box">
                            <div class="ticket-row">
                                <span class="ticket-label">Ticket Reference</span>
                                <span class="ticket-val">%s</span>
                            </div>
                            <div class="ticket-row">
                                <span class="ticket-label">Subject</span>
                                <span class="ticket-val">%s</span>
                            </div>
                            <div class="ticket-row">
                                <span class="ticket-label">Resolved By</span>
                                <span class="ticket-val">%s</span>
                            </div>
                            <div class="ticket-row">
                                <span class="ticket-label">Status</span>
                                <span class="ticket-val" style="color: #059669;">RESOLVED</span>
                            </div>
                        </div>

                        <form class="comment-form" action="/api/public/feedback/comment" method="POST">
                            <input type="hidden" name="ticketId" value="%d" />
                            <input type="hidden" name="token" value="%s" />
                            <input type="hidden" id="selectedTags" name="tags" value="%s" />
                            <label>Add Optional Written Comments & Tags</label>
                            
                            <div class="tag-chips">
                                <button type="button" class="chip-btn" onclick="addTag(this, '⚡ Fast Resolution')">⚡ Fast Resolution</button>
                                <button type="button" class="chip-btn" onclick="addTag(this, '🤝 Helpful & Polite')">🤝 Helpful & Polite</button>
                                <button type="button" class="chip-btn" onclick="addTag(this, '💡 Solved First Time')">💡 Solved First Time</button>
                                <button type="button" class="chip-btn" onclick="addTag(this, '📝 Clear Explanation')">📝 Clear Explanation</button>
                            </div>

                            <textarea name="comment" placeholder="Tell us more about your support experience (optional)...">%s</textarea>
                            <button type="submit" class="btn-submit">Submit Additional Comments</button>
                        </form>

                        <div style="text-align: center;">
                            <a href="%s" class="btn-portal">Open Ticket in Workspace Portal &rarr;</a>
                        </div>
                    </div>
                    <div class="footer">
                        &copy; 2026 TicketPro Cloud &bull; Real-time CSAT Automated Feedback &bull; %s
                    </div>
                </div>

                <script>
                    const tags = new Set();
                    function addTag(btn, tag) {
                        if (tags.has(tag)) {
                            tags.delete(tag);
                            btn.style.background = '#ffffff';
                            btn.style.color = '#334155';
                            btn.style.borderColor = '#cbd5e1';
                        } else {
                            tags.add(tag);
                            btn.style.background = '#4f46e5';
                            btn.style.color = '#ffffff';
                            btn.style.borderColor = '#4f46e5';
                        }
                        document.getElementById('selectedTags').value = Array.from(tags).join(', ');
                    }
                </script>
            </body>
            </html>
            """.formatted(
                escapeHtml(company),
                escapeHtml(company),
                escapeHtml(customer),
                starDisplay.toString(),
                escapeHtml(ratingLabel),
                commentSaved ? "<div style=\"background: #dbeafe; color: #1e40af; padding: 10px 16px; border-radius: 10px; font-size: 13px; font-weight: 700; margin-bottom: 20px;\">&#10003; Additional comments updated successfully!</div>" : "",
                escapeHtml(ticketNum),
                escapeHtml(ticketSubj),
                escapeHtml(agent),
                response.getTicketId(),
                escapeHtml(token != null ? token : ""),
                escapeHtml(response.getTags() != null ? response.getTags() : ""),
                escapeHtml(currentComment),
                portalLink,
                escapeHtml(company)
        );
    }

    private String generateErrorHtml(String title, String message) {
        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>%s &bull; TicketPro</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8fafc; color: #0f172a; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
                    .card { background: #ffffff; max-width: 480px; width: 100%%; border-radius: 20px; box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.07); border: 1px solid #fee2e2; padding: 32px; text-align: center; }
                    .icon { font-size: 40px; margin-bottom: 16px; color: #ef4444; }
                    h1 { font-size: 20px; font-weight: 800; color: #991b1b; margin-bottom: 8px; }
                    p { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
                    a { display: inline-block; background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 10px; text-decoration: none; font-size: 13px; font-weight: 700; }
                </style>
            </head>
            <body>
                <div class="card">
                    <div class="icon">&#9888;&#65039;</div>
                    <h1>%s</h1>
                    <p>%s</p>
                    <a href="%s">Go to TicketPro Portal</a>
                </div>
            </body>
            </html>
            """.formatted(escapeHtml(title), escapeHtml(title), escapeHtml(message != null ? message : "Unable to process request."), frontendUrl);
    }

    /**
     * SECURITY C-8: HTML-escape user-controlled strings to prevent XSS in generated HTML pages.
     */
    private String escapeHtml(String input) {
        if (input == null) return "";
        return input.replace("&", "&amp;").replace("<", "&lt;")
                    .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
