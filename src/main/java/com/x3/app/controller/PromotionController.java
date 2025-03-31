package com.x3.app.controller;

import com.x3.app.model.Promotion;
import com.x3.app.model.User;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.PromotionService;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
public class PromotionController {
    
    private final PromotionService promotionService;
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        List<Promotion> promotions = promotionService.getAllPromotions();
        return ResponseEntity.ok(promotions);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getPromotionById(@PathVariable Long id) {
        Optional<Promotion> promotion = promotionService.getPromotionById(id);
        
        if (promotion.isPresent()) {
            // Check if the user is authorized to view this promotion
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            if (promotion.get().getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
                return ResponseEntity.ok(promotion.get());
            } else {
                return ResponseEntity.status(403).body(new MessageResponse("Unauthorized access to promotion"));
            }
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/user")
    public ResponseEntity<?> getUserPromotions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<Promotion> promotions = promotionService.getPromotionsByUser(user.get());
            return ResponseEntity.ok(promotions);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/unpaid")
    public ResponseEntity<?> getUnpaidPromotions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<Promotion> promotions = promotionService.getUnpaidPromotionsByUser(user.get());
            return ResponseEntity.ok(promotions);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/commission")
    public ResponseEntity<?> getUnpaidCommissionTotal() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            BigDecimal total = promotionService.getUnpaidCommissionTotal(user.get());
            return ResponseEntity.ok(
                    new Object() {
                        public final BigDecimal unpaidCommission = total;
                    }
            );
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @PostMapping("/mark-paid")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> markPromotionsAsPaid(@RequestParam Long userId) {
        Optional<User> user = userService.getUserById(userId);
        
        if (user.isPresent()) {
            List<Promotion> promotions = promotionService.markPromotionsAsPaid(user.get());
            return ResponseEntity.ok(promotions);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/statistics")
    public ResponseEntity<?> getPromotionStatistics() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            Long count = promotionService.getPromotionCountByUser(user.get());
            BigDecimal total = promotionService.getUnpaidCommissionTotal(user.get());
            
            return ResponseEntity.ok(
                    new Object() {
                        public final Long totalPromotions = count;
                        public final BigDecimal unpaidCommission = total;
                    }
            );
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
}