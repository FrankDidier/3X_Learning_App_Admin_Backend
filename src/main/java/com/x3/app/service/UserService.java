package com.x3.app.service;

import com.x3.app.model.Role;
import com.x3.app.model.User;
import com.x3.app.repository.RoleRepository;
import com.x3.app.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }
    
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }
    
    public Optional<User> getUserByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }
    
    @Transactional
    public User createUser(User user, Set<Role.ERole> roleNames) {
        // Generate a unique promotion code
        String promotionCode = generateUniquePromotionCode();
        user.setPromotionCode(promotionCode);
        
        // Assign roles
        Set<Role> roles = new HashSet<>();
        roleNames.forEach(roleName -> {
            Role role = roleRepository.findByName(roleName)
                    .orElseThrow(() -> new RuntimeException("Error: Role not found."));
            roles.add(role);
        });
        user.setRoles(roles);
        
        return userRepository.save(user);
    }
    
    @Transactional
    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    @Transactional
    public void deleteUser(Long id) {
        userRepository.deleteById(id);
    }
    
    public boolean existsByPhone(String phone) {
        return userRepository.existsByPhone(phone);
    }
    
    public Optional<User> findByPromotionCode(String promotionCode) {
        return userRepository.findByPromotionCode(promotionCode);
    }
    
    private String generateUniquePromotionCode() {
        String code;
        do {
            code = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        } while (userRepository.findByPromotionCode(code).isPresent());
        
        return code;
    }
}