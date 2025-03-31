package com.x3.app.repository;

import com.x3.app.model.Promotion;
import com.x3.app.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    List<Promotion> findByUser(User user);
    List<Promotion> findByUserAndPaid(User user, boolean paid);
    
    @Query("SELECT SUM(p.commissionAmount) FROM Promotion p WHERE p.user = ?1 AND p.paid = false")
    BigDecimal sumUnpaidCommission(User user);
    
    @Query("SELECT COUNT(p) FROM Promotion p WHERE p.user = ?1")
    Long countPromotionsByUser(User user);
}