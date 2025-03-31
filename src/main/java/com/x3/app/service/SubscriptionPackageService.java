package com.x3.app.service;

import com.x3.app.model.SubscriptionPackage;
import com.x3.app.repository.SubscriptionPackageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class SubscriptionPackageService {
    
    private final SubscriptionPackageRepository packageRepository;
    
    public List<SubscriptionPackage> getAllPackages() {
        return packageRepository.findAll();
    }
    
    public Optional<SubscriptionPackage> getPackageById(Long id) {
        return packageRepository.findById(id);
    }
    
    public List<SubscriptionPackage> getActivePackages() {
        return packageRepository.findByActiveTrue();
    }
    
    @Transactional
    public SubscriptionPackage createPackage(SubscriptionPackage subscriptionPackage) {
        return packageRepository.save(subscriptionPackage);
    }
    
    @Transactional
    public SubscriptionPackage updatePackage(SubscriptionPackage subscriptionPackage) {
        return packageRepository.save(subscriptionPackage);
    }
    
    @Transactional
    public void deletePackage(Long id) {
        packageRepository.deleteById(id);
    }
}