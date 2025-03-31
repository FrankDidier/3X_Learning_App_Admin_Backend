package com.x3.app.service;

import com.x3.app.model.Payment;
import com.x3.app.model.Promotion;
import com.x3.app.model.User;
import com.x3.app.repository.PromotionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PromotionService {
    
    private final PromotionRepository promotionRepository;
    
    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }
    
    public Optional<Promotion> getPromotionById(Long id) {
        return promotionRepository.findById(id);
    }
    
    public List<Promotion> getPromotionsByUser(User user) {
        return promotionRepository.findByUser(user);
    }
    
    public List<Promotion> getUnpaidPromotionsByUser(User user) {
        return promotionRepository.findByUserAndPaid(user, false);
    }
    
    public BigDecimal getUnpaidCommissionTotal(User user) {
        return promotionRepository.sumUnpaidCommission(user);
    }
    
    public Long getPromotionCountByUser(User user) {
        return promotionRepository.countPromotionsByUser(user);
    }
    
    @Transactional
    public Promotion createPromotion(User promoter, User invitedUser, Payment payment) {
        Promotion promotion = new Promotion();
        promotion.setUser(promoter);
        promotion.setInvitedUser(invitedUser);
        
        // Calculate commission (e.g., 10% of payment amount)
        BigDecimal commissionRate = new BigDecimal("0.10");
        BigDecimal commissionAmount = payment.getAmount().multiply(commissionRate).setScale(2, RoundingMode.HALF_UP);
        promotion.setCommissionAmount(commissionAmount);
        
        return promotionRepository.save(promotion);
    }
    
    @Transactional
    public List<Promotion> markPromotionsAsPaid(User user) {
        List<Promotion> unpaidPromotions = promotionRepository.findByUserAndPaid(user, false);
        
        for (Promotion promotion : unpaidPromotions) {
            promotion.setPaid(true);
            promotion.setPaidAt(LocalDateTime.now());
        }
        
        return promotionRepository.saveAll(unpaidPromotions);
    }
}