package com.x3.app.payload.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;
import javax.validation.constraints.NotNull;

@Data
public class PaymentRequest {
    
    @NotNull
    private Long packageId;
    
    @NotBlank
    private String paymentMethod;
}