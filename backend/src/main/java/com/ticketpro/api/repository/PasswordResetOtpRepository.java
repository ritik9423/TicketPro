package com.ticketpro.api.repository;

import com.ticketpro.api.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {

    Optional<PasswordResetOtp> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    @Modifying
    @Transactional
    @Query("UPDATE PasswordResetOtp o SET o.used = true WHERE o.email = :email AND o.used = false")
    void invalidateAllPendingByEmail(@Param("email") String email);

    @Modifying
    @Transactional
    @Query("DELETE FROM PasswordResetOtp o WHERE o.expiryTime < :cutoff")
    void deleteExpiredOtps(@Param("cutoff") LocalDateTime cutoff);
}
