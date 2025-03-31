package com.x3.app.controller;

import com.x3.app.model.User;
import com.x3.app.payload.request.UpdateUserRequest;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        return ResponseEntity.ok(users);
    }
    
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or @userSecurity.isCurrentUser(#id)")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        Optional<User> user = userService.getUserById(id);
        
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/profile")
    public ResponseEntity<?> getCurrentUserProfile() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            return ResponseEntity.ok(user.get());
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @PutMapping("/profile")
    public ResponseEntity<?> updateCurrentUserProfile(@RequestBody UpdateUserRequest updateRequest) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> optionalUser = userService.getUserById(userDetails.getId());
        
        if (optionalUser.isPresent()) {
            User user = optionalUser.get();
            
            // Update only allowed fields
            if (updateRequest.getName() != null) {
                user.setName(updateRequest.getName());
            }
            
            if (updateRequest.getStudentId() != null) {
                user.setStudentId(updateRequest.getStudentId());
            }
            
            User updatedUser = userService.updateUser(user);
            return ResponseEntity.ok(updatedUser);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/check-promotion-code/{code}")
    public ResponseEntity<?> checkPromotionCode(@PathVariable String code) {
        Optional<User> user = userService.findByPromotionCode(code);
        
        if (user.isPresent()) {
            return ResponseEntity.ok(
                    new Object() {
                        public final boolean valid = true;
                        public final String promoterName = user.get().getName();
                    }
            );
        } else {
            return ResponseEntity.ok(
                    new Object() {
                        public final boolean valid = false;
                    }
            );
        }
    }
    
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> searchUsers(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String studentId) {
        
        List<User> users;
        
        if (name != null && !name.isEmpty()) {
            users = userService.findByNameContaining(name);
        } else if (phone != null && !phone.isEmpty()) {
            users = userService.findByPhoneContaining(phone);
        } else if (studentId != null && !studentId.isEmpty()) {
            users = userService.findByStudentIdContaining(studentId);
        } else {
            users = userService.getAllUsers();
        }
        
        return ResponseEntity.ok(users);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody User user) {
        Optional<User> existingUser = userService.getUserById(id);
        
        if (existingUser.isPresent()) {
            user.setId(id);
            User updatedUser = userService.updateUser(user);
            return ResponseEntity.ok(updatedUser);
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        Optional<User> existingUser = userService.getUserById(id);
        
        if (existingUser.isPresent()) {
            userService.deleteUser(id);
            return ResponseEntity.ok(new MessageResponse("User deleted successfully"));
        } else {
            return ResponseEntity.notFound().build();
        }
    }
}