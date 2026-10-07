import React, { useState, useEffect } from 'react';
import { 
  Star, 
  X, 
  Sparkles, 
  CheckCircle2, 
  UserCheck, 
  Send, 
  ThumbsUp, 
  Clock, 
  ShieldCheck,
  MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';
import { liveChannel } from '../../utils/liveChannel';
import { createNotification } from '../../utils/notify';

const RATING_LEVELS = {
  5: { label: 'Outstanding & Exceptional!', emoji: '🤩', color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200' },
  4: { label: 'Very Good & Helpful', emoji: '😊', color: 'text-blue-500', bg: 'bg-blue-50 border-blue-200' },
  3: { label: 'Satisfactory / Average', emoji: '😐', color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
  2: { label: 'Below Expectations', emoji: '🙁', color: 'text-orange-500', bg: 'bg-orange-50 border-orange-200' },
  1: { label: 'Needs Major Improvement', emoji: '😡', color: 'text-rose-500', bg: 'bg-rose-50 border-rose-200' }
};

const CSAT_TAGS = [
  '⚡ Super Fast Resolution',
  '🎯 Clear & Accurate Answer',
  '🤝 Friendly & Courteous',
  '🔧 Strong Technical Expertise',
  '⏱️ Delayed Response',
  '📋 Communication Gap'
];

export const CsatRatingModal = ({ isOpen, onClose, ticket, onSubmitSuccess }) => {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [selectedTags, setSelectedTags] = useState(['⚡ Super Fast Resolution', '🤝 Friendly & Courteous']);
  const [submitting, setSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setSubmitting(false);
      // Pre-populate if already rated
      if (ticket?.satisfactionRating) {
        setRating(ticket.satisfactionRating);
        setFeedback(ticket.satisfactionFeedback || '');
      } else {
        setRating(5);
        setFeedback('');
        setSelectedTags(['⚡ Super Fast Resolution', '🤝 Friendly & Courteous']);
      }
    }
  }, [isOpen, ticket]);

  if (!isOpen || !ticket) return null;

  const agentName = ticket.assignedTo?.name || 
                    ticket.assignedAgent || 
                    ticket.assignee || 
                    'Support Team Specialist';

  const toggleTag = (tag) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!rating) return;

    setSubmitting(true);
    const ticketId = ticket.id;
    const payload = {
      rating,
      feedback: feedback.trim(),
      tags: selectedTags,
      customerName: ticket.creatorName || ticket.createdBy?.name || 'Valued Customer',
      customerEmail: ticket.creatorEmail || ticket.createdBy?.email || null
    };

    try {
      await api.post(`/tickets/${ticketId}/feedback`, payload);
    } catch (_e) {
      console.warn('Feedback API sync notice:', _e);
    }

    // Save to localStorage for instant client rendering
    try {
      const csatRecord = {
        rating,
        feedback: payload.feedback,
        tags: selectedTags,
        submittedAt: new Date().toISOString()
      };
      localStorage.setItem(`csat_rating_${ticketId}`, JSON.stringify(csatRecord));
      localStorage.setItem(`csat_rating_${ticket.ticketNumber}`, JSON.stringify(csatRecord));

      // Also update ticket in session ticket cache
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('tp_tickets_')) {
          try {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              let list = JSON.parse(raw);
              if (Array.isArray(list)) {
                list = list.map(t => {
                  if (String(t.id) === String(ticketId) || t.ticketNumber === ticket.ticketNumber) {
                    return {
                      ...t,
                      satisfactionRating: rating,
                      satisfactionFeedback: payload.feedback,
                      satisfactionTags: selectedTags.join(', '),
                      satisfactionRatedAt: new Date().toISOString()
                    };
                  }
                  return t;
                });
                sessionStorage.setItem(key, JSON.stringify(list));
              }
            }
          } catch (_err) {}
        }
      }
    } catch (_err) {}

    // Broadcast live event and dispatch notification
    try {
      const agentEmail = ticket?.assignedTo?.email || ticket?.assignedAgentEmail;
      const cleanNum = (ticket?.ticketNumber || `#TK-${ticketId}`).replace(/^[#]+/, '');
      const recipients = [];
      if (agentEmail) recipients.push(agentEmail);
      if (ticket?.companyCode) recipients.push(`admin@${ticket.companyCode.toLowerCase()}.com`);

      createNotification({
        title: rating <= 2 ? `⚠️ Low CSAT Alert (${rating}/5 Stars)` : `🌟 CSAT Review: ${rating}/5 Stars Received`,
        message: `Customer ${payload.customerName || 'Customer'} submitted a ${rating}-Star rating for Ticket #${cleanNum}${payload.feedback ? `: "${payload.feedback}"` : '.'}`,
        type: rating <= 2 ? 'CSAT_WARNING' : 'CSAT_RATING',
        link: `/tickets/${ticketId}`,
        targetRole: 'AGENT',
        recipients
      });

      liveChannel.broadcast('TICKET_UPDATED', { ticketId, action: 'CSAT', rating });
    } catch (_e) {}

    setIsSuccess(true);
    setSubmitting(false);

    if (onSubmitSuccess) {
      onSubmitSuccess({ rating, feedback: payload.feedback, tags: selectedTags });
    }

    setTimeout(() => {
      onClose();
    }, 1600);
  };

  const activeLevel = RATING_LEVELS[hoverRating || rating] || RATING_LEVELS[5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-cyan-100 overflow-hidden transform transition-all animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Background Banner */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 px-5 py-4 sm:px-6 sm:py-5 text-white shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-extrabold uppercase tracking-wider">
              {ticket.ticketNumber || `#${ticket.id}`}
            </span>
            <span className="flex items-center text-xs text-indigo-100 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 mr-1 text-emerald-300" />
              Ticket Resolved
            </span>
          </div>

          <h2 className="text-lg sm:text-xl font-black mt-1 text-white tracking-tight">
            How was your support experience?
          </h2>
          <p className="text-xs text-indigo-100/90 line-clamp-1 mt-0.5">
            Subject: {ticket.subject}
          </p>
        </div>

        {/* Modal Body */}
        {isSuccess ? (
          <div className="p-6 sm:p-8 text-center space-y-4 animate-in zoom-in-90 duration-300 overflow-y-auto flex-1">
            <div className="mx-auto h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
              <CheckCircle2 className="h-10 w-10 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900">Thank You For Your Feedback!</h3>
              <p className="text-sm text-slate-600 mt-1">
                Your <span className="font-bold text-amber-500">{rating}★ rating</span> has been submitted. It helps {agentName} and our team continuously improve support quality.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
            {/* Agent Info Box */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white font-black flex items-center justify-center shadow-sm">
                  {agentName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Support Resolver</p>
                  <p className="text-sm font-extrabold text-slate-800 flex items-center">
                    <UserCheck className="h-3.5 w-3.5 mr-1 text-cyan-700" />
                    {agentName}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Fast Support
                </span>
              </div>
            </div>

            {/* Interactive 5-Star Rating */}
            <div className="text-center space-y-2 py-2">
              <div className="flex items-center justify-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isFilled = (hoverRating || rating) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1.5 focus:outline-hidden transform hover:scale-125 transition-all duration-150 cursor-pointer"
                    >
                      <Star
                        className={`h-9 w-9 transition-colors duration-150 ${
                          isFilled
                            ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                            : 'text-slate-200 fill-slate-100 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>

              {/* Dynamic Emotional Indicator Banner */}
              <div className={`inline-flex items-center px-3.5 py-1 rounded-full border text-xs font-black transition-all ${activeLevel.bg} ${activeLevel.color}`}>
                <span className="mr-1.5 text-base">{activeLevel.emoji}</span>
                <span>{rating}/5 Stars — {activeLevel.label}</span>
              </div>
            </div>

            {/* Quick Reason Chips */}
            <div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                What went well? (Select tags)
              </p>
              <div className="flex flex-wrap gap-2">
                {CSAT_TAGS.map((tag) => {
                  const selected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all border ${
                        selected
                          ? 'bg-indigo-600 text-white border-cyan-500 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed Feedback Note */}
            <div>
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span className="flex items-center">
                  <MessageSquare className="h-3.5 w-3.5 mr-1 text-cyan-700" />
                  Additional Notes (Optional)
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Feedback goes directly to management</span>
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Tell us what you loved or how we could do even better..."
                rows={3}
                className="w-full text-xs rounded-xl border border-slate-200 p-3 text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 px-4 py-2 rounded-xl transition-colors"
              >
                Maybe Later
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-black shadow-md shadow-indigo-200 flex items-center space-x-2 transition-all transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {submitting ? (
                  <span>Recording...</span>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Submit CSAT Feedback</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CsatRatingModal;
