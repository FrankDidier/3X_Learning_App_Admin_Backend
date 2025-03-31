package com.x3.app.controller;

import com.x3.app.model.SubscriptionPackage;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.service.SubscriptionPackageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/packages")
@RequiredArgsConstructor
public class SubscriptionPackageController {
    
    private final SubscriptionPackageService packageService;
    
    @GetMapping
    public ResponseEntity<List<SubscriptionPackage>> getAllPackages() {
        List<SubscriptionPackage> packages = packageService.getAllPackages();
        return ResponseEntity.ok(packages);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getPackageById(@PathVariable Long id) {
        Optional<SubscriptionPackage> subscriptionPackage = packageService.getPackageById(id);
        
        if (subscriptionPackage.isPresent()) {
            return ResponseEntity.ok(subscriptionPackage.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/active")
    public ResponseEntity<List<SubscriptionPackage>> getActivePackages() {
        List<SubscriptionPackage> packages = packageService.getActivePackages();
        return ResponseEntity.ok(packages);
    }
    
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<SubscriptionPackage> createPackage(@RequestBody SubscriptionPackage subscriptionPackage) {
        SubscriptionPackage createdPackage = packageService.createPackage(subscriptionPackage);
        return ResponseEntity.ok(createdPackage);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePackage(@PathVariable Long id, @RequestBody SubscriptionPackage subscriptionPackage) {
        Optional<SubscriptionPackage> existingPackage = packageService.getPackageById(id);
        
        if (existingPackage.isPresent()) {
            subscriptionPackage.setId(id);
            SubscriptionPackage updatedPackage = packageService.updatePackage(subscriptionPackage);
            return ResponseEntity.ok(updatedPackage);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePackage(@PathVariable Long id) {
        Optional<SubscriptionPackage> existingPackage = packageService.getPackageById(id);
        
        if (existingPackage.isPresent()) {
            packageService.deletePackage(id);
            return ResponseEntity.ok(new MessageResponse("Package deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}