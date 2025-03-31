package com.x3.app.controller;

import com.x3.app.model.Payment;
import com.x3.app.model.SubscriptionPackage;
import com.x3.app.model.User;
import com.x3.app.payload.request.PaymentRequest;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.PaymentService;
import com.x3.app.service.SubscriptionPackageService;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {
    
    private final PaymentService paymentService;
    private final UserService userService;
    private final SubscriptionPackageService packageService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Payment>> getAllPayments() {
        List<Payment> payments = paymentService.getAllPayments();
        return ResponseEntity.ok(payments);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getPaymentById(@PathVariable Long id) {
        Optional<Payment> payment = paymentService.getPaymentById(id);
        
        if (payment.isPresent()) {
            // Check if the user is authorized to view this payment
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            if (payment.get().getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.ok(payment.get());
            } else {
                return ResponseEntity.status(403).body(new MessageResponse("Unauthorized access to payment"));
            }
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/user")
    public ResponseEntity<?> getUserPayments() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<Payment> payments = paymentService.getPaymentsByUser(user.get());
            return ResponseEntity.ok(payments);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/status/{status}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Payment>> getPaymentsByStatus(@PathVariable String status) {
        try {
            Payment.PaymentStatus statusEnum = Payment.PaymentStatus.valueOf(status);
            List<Payment> payments = paymentService.getPaymentsByStatus(statusEnum);
            return ResponseEntity.ok(payments);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/date-range")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Payment>> getPaymentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate) {
        
        List<Payment> payments = paymentService.getPaymentsByDateRange(startDate, endDate);
        return ResponseEntity.ok(payments);
    }
    
    @PostMapping("/create")
    public ResponseEntity<?> createPayment(@RequestBody PaymentRequest paymentRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        Optional<SubscriptionPackage> subscriptionPackage = packageService.getPackageById(paymentRequest.getPackageId());
        
        if (user.isPresent() && subscriptionPackage.isPresent()) {
            try {
                Payment.PaymentMethod paymentMethod = Payment.PaymentMethod.valueOf(paymentRequest.getPaymentMethod());
                
                // Check for abnormal payment behavior
                if (paymentService.checkForAbnormalPayments(user.get(), 5)) {
                    return ResponseEntity.badRequest().body(new MessageResponse("Too many payment attempts in a short time"));
                }
                
                Payment payment = paymentService.createPayment(user.get(), subscriptionPackage.get(), paymentMethod);
                return ResponseEntity.ok(payment);
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body(new MessageResponse("Invalid payment method"));
            }
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User or Package not found"));
        }
    }
    
    @PostMapping("/callback")
    public ResponseEntity<?> paymentCallback(
            @RequestParam String orderNumber,
            @RequestParam String status,
            @RequestParam(required = false) String transactionId) {
        
        try {
            Payment.PaymentStatus paymentStatus = Payment.PaymentStatus.valueOf(status);
            Payment updatedPayment = paymentService.updatePaymentStatus(orderNumber, paymentStatus, transactionId);
            return ResponseEntity.ok(updatedPayment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid payment status"));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
}