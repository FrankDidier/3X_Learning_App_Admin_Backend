package com.x3.app.controller;

import com.x3.app.model.AiAssistanceLog;
import com.x3.app.model.User;
import com.x3.app.payload.request.AiAssistanceRequest;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.AiAssistanceService;
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
@RequestMapping("/api/ai-assistance")
@RequiredArgsConstructor
public class AiAssistanceController {
    
    private final AiAssistanceService aiAssistanceService;
    private final UserService userService;
    
    @GetMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<AiAssistanceLog>> getAllAiAssistanceLogs() {
        List<AiAssistanceLog> logs = aiAssistanceService.getAllAiAssistanceLogs();
        return ResponseEntity.ok(logs);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<?> getAiAssistanceLogById(@PathVariable Long id) {
        Optional<AiAssistanceLog> log = aiAssistanceService.getAiAssistanceLogById(id);
        
        if (log.isPresent()) {
            // Check if the user is authorized to view this log
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            
            if (log.get().getUser().getId().equals(userDetails.getId()) || 
                    authentication.getAuthorities().stream().anyMatch(a -> 
                            a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_TEACHER"))) {
                return ResponseEntity.ok(log.get());
            } else {
                return ResponseEntity.status(403).body(new MessageResponse("Unauthorized access to AI assistance log"));
            }
        } else {
            return ResponseEntity.notFound().build();
        }
    }
    
    @GetMapping("/user")
    public ResponseEntity<?> getUserAiAssistanceLogs() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            List<AiAssistanceLog> logs = aiAssistanceService.getAiAssistanceLogsByUser(user.get());
            return ResponseEntity.ok(logs);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @GetMapping("/unanswered")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<AiAssistanceLog>> getUnansweredAiAssistanceLogs() {
        List<AiAssistanceLog> logs = aiAssistanceService.getUnansweredAiAssistanceLogs();
        return ResponseEntity.ok(logs);
    }
    
    @PostMapping("/ask")
    public ResponseEntity<?> createAiAssistanceLog(@RequestBody AiAssistanceRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        
        Optional<User> user = userService.getUserById(userDetails.getId());
        
        if (user.isPresent()) {
            // Check if the user has made too many requests recently
            Long recentQueries = aiAssistanceService.countRecentQueriesByUser(user.get(), 1);
            if (recentQueries >= 5) {
                return ResponseEntity.badRequest().body(new MessageResponse("Too many requests. Please try again later."));
            }
            
            AiAssistanceLog log = aiAssistanceService.createAiAssistanceLog(
                    user.get(), request.getQuestion(), request.getKnowledgePoint());
            return ResponseEntity.ok(log);
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("User not found"));
        }
    }
    
    @PostMapping("/{id}/answer")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<?> updateAiAssistanceLogWithAnswer(
            @PathVariable Long id,
            @RequestParam String answer) {
        
        try {
            AiAssistanceLog log = aiAssistanceService.updateAiAssistanceLogWithAnswer(id, answer);
            return ResponseEntity.ok(log);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }
    
    @GetMapping("/knowledge-point/{knowledgePoint}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TEACHER')")
    public ResponseEntity<List<AiAssistanceLog>> getAiAssistanceLogsByKnowledgePoint(
            @PathVariable String knowledgePoint) {
        
        List<AiAssistanceLog> logs = aiAssistanceService.getAiAssistanceLogsByKnowledgePoint(knowledgePoint);
        return ResponseEntity.ok(logs);
    }
}