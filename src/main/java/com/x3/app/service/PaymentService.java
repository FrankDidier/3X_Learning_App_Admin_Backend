package com.x3.app.service;

import com.x3.app.model.Payment;
import com.x3.app.model.SubscriptionPackage;
import com.x3.app.model.User;
import com.x3.app.repository.PaymentRepository;
import com.x3.app.repository.SubscriptionPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {
    
    private final PaymentRepository paymentRepository;
    private final SubscriptionPackageRepository packageRepository;
    
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }
    
    public Optional<Payment> getPaymentById(Long id) {
        return paymentRepository.findById(id);
    }
    
    public List<Payment> getPaymentsByUser(User user) {
        return paymentRepository.findByUser(user);
    }
    
    public Optional<Payment> getPaymentByOrderNumber(String orderNumber) {
        return paymentRepository.findByOrderNumber(orderNumber);
    }
    
    public List<Payment> getPaymentsByStatus(Payment.PaymentStatus status) {
        return paymentRepository.findByStatus(status);
    }
    
    public List<Payment> getPaymentsByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return paymentRepository.findByDateRange(startDate, endDate);
    }
    
    public BigDecimal getSumPaidAmountByDateRange(LocalDateTime startDate, LocalDateTime endDate) {
        return paymentRepository.sumPaidAmountByDateRange(startDate, endDate);
    }
    
    @Transactional
    public Payment createPayment(User user, SubscriptionPackage subscriptionPackage, Payment.PaymentMethod paymentMethod) {
        Payment payment = new Payment();
        payment.setUser(user);
        payment.setOrderNumber(generateOrderNumber());
        payment.setAmount(subscriptionPackage.getPrice());
        payment.setPaymentMethod(paymentMethod);
        payment.setStatus(Payment.PaymentStatus.PENDING);
        payment.setSubscriptionPackage(subscriptionPackage);
        
        return paymentRepository.save(payment);
    }
    
    @Transactional
    public Payment updatePaymentStatus(String orderNumber, Payment.PaymentStatus status, String transactionId) {
        Optional<Payment> optionalPayment = paymentRepository.findByOrderNumber(orderNumber);
        
        if (optionalPayment.isPresent()) {
            Payment payment = optionalPayment.get();
            payment.setStatus(status);
            payment.setTransactionId(transactionId);
            
            if (status == Payment.PaymentStatus.PAID) {
                payment.setPaidAt(LocalDateTime.now());
                
                // Set subscription validity period
                SubscriptionPackage subscriptionPackage = payment.getSubscriptionPackage();
                if (subscriptionPackage != null) {
                    payment.setValidUntil(LocalDateTime.now().plusDays(subscriptionPackage.getDurationDays()));
                }
            }
            
            return paymentRepository.save(payment);
        }
        
        throw new RuntimeException("Payment not found with order number: " + orderNumber);
    }
    
    public boolean checkForAbnormalPayments(User user, int minutesThreshold) {
        LocalDateTime since = LocalDateTime.now().minusMinutes(minutesThreshold);
        List<Payment> recentPayments = paymentRepository.findRecentPaymentsByUser(user, since);
        
        return recentPayments.size() > 1;
    }
    
    private String generateOrderNumber() {
        return "ORD" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}