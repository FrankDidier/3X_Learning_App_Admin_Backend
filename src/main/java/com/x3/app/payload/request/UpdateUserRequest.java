package com.x3.app.payload.request;

import lombok.Data;

@Data
public class UpdateUserRequest {
    
    private String name;
    private String studentId;
}