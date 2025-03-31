package com.x3.app.repository;

import com.x3.app.model.Payment;
import com.x3.app.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByUser(User user);
    Optional<Payment> findByOrderNumber(String orderNumber);
    List<Payment> findByStatus(Payment.PaymentStatus status);
    
    @Query("SELECT p FROM Payment p WHERE p.createdAt BETWEEN ?1 AND ?2")
    List<Payment> findByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT SUM(p.amount) FROM Payment p WHERE p.status = 'PAID' AND p.createdAt BETWEEN ?1 AND ?2")
    BigDecimal sumPaidAmountByDateRange(LocalDateTime startDate, LocalDateTime endDate);
    
    @Query("SELECT p FROM Payment p WHERE p.user = ?1 AND p.createdAt > ?2 AND p.status = 'PAID'")
    List<Payment> findRecentPaymentsByUser(User user, LocalDateTime since);
}