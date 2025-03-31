package com.x3.app.payload.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.Size;

@Data
public class SignupRequest {
    
    @NotBlank
    @Size(min = 3, max = 50)
    private String name;
    
    @NotBlank
    @Size(min = 11, max = 11)
    private String phone;
    
    private String studentId;
    
    private String invitationCode;
}