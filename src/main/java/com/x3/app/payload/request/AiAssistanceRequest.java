package com.x3.app.payload.request;

import lombok.Data;

import javax.validation.constraints.NotBlank;

@Data
public class AiAssistanceRequest {
    
    @NotBlank
    private String question;
    
    private String knowledgePoint;
}