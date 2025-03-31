package com.x3.app.controller;

import com.x3.app.model.Role;
import com.x3.app.model.User;
import com.x3.app.payload.request.LoginRequest;
import com.x3.app.payload.request.SignupRequest;
import com.x3.app.payload.request.VerifyCodeRequest;
import com.x3.app.payload.response.JwtResponse;
import com.x3.app.payload.response.MessageResponse;
import com.x3.app.security.jwt.JwtUtils;
import com.x3.app.security.services.UserDetailsImpl;
import com.x3.app.service.OperationLogService;
import com.x3.app.service.SmsService;
import com.x3.app.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpServletRequest;
import javax.validation.Valid;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    
    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final SmsService smsService;
    private final JwtUtils jwtUtils;
    private final OperationLogService operationLogService;
    
    @PostMapping("/send-code")
    public ResponseEntity<?> sendVerificationCode(@RequestParam String phone) {
        if (smsService.sendVerificationCode(phone)) {
            return ResponseEntity.ok(new MessageResponse("Verification code sent successfully"));
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Failed to send verification code"));
        }
    }
    
    @PostMapping("/verify-code")
    public ResponseEntity<?> verifyCode(@Valid @RequestBody VerifyCodeRequest verifyCodeRequest) {
        if (smsService.verifyCode(verifyCodeRequest.getPhone(), verifyCodeRequest.getCode())) {
            return ResponseEntity.ok(new MessageResponse("Code verified successfully"));
        } else {
            return ResponseEntity.badRequest().body(new MessageResponse("Invalid verification code"));
        }
    }
    
    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getPhone(), "default-password"));
        
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);
        
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        Set<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .collect(Collectors.toSet());
        
        // Log the operation
        operationLogService.createOperationLog(
                "LOGIN",
                "User logged in: " + loginRequest.getPhone(),
                userDetails.getId(),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        );
        
        return ResponseEntity.ok(new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getName(),
                roles));
    }
    
    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signupRequest, HttpServletRequest request) {
        if (userService.existsByPhone(signupRequest.getPhone())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Phone is already in use!"));
        }
        
        // Create new user's account
        User user = new User();
        user.setName(signupRequest.getName());
        user.setPhone(signupRequest.getPhone());
        user.setStudentId(signupRequest.getStudentId());
        
        if (signupRequest.getInvitationCode() != null && !signupRequest.getInvitationCode().isEmpty()) {
            userService.findByPromotionCode(signupRequest.getInvitationCode())
                    .ifPresent(inviter -> user.setInvitedBy(inviter.getId()));
        }
        
        Set<Role.ERole> roles = new HashSet<>();
        roles.add(Role.ERole.ROLE_STUDENT); // Default role
        
        User savedUser = userService.createUser(user, roles);
        
        // Log the operation
        operationLogService.createOperationLog(
                "REGISTER",
                "New user registered: " + signupRequest.getPhone(),
                savedUser.getId(),
                request.getRemoteAddr(),
                request.getHeader("User-Agent")
        );
        
        return ResponseEntity.ok(new MessageResponse("User registered successfully!"));
    }
}