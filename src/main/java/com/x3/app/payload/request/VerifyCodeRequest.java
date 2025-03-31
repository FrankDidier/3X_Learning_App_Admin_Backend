package com.x3.app.payload.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class VerifyCodeRequest {
    
    @NotBlank
    private String phone;
    
    @NotBlank
    private String code;
}