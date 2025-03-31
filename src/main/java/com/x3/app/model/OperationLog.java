package com.x3.app.model;

import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "operation_logs")
public class OperationLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String operationType;
    
    @Column(nullable = false)
    private String operationDetails;
    
    @Column
    private Long userId;
    
    @Column
    private String ipAddress;
    
    @Column
    private String userAgent;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}