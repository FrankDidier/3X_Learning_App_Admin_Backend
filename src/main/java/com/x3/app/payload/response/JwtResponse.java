package com.x3.app.payload.response;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Set;

@Data
@AllArgsConstructor
public class JwtResponse {
    
    private String token;
    private Long id;
    private String phone;
    private String name;
    private Set<String> roles;
}