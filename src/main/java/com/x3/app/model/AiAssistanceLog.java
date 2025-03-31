package com.x3.app.model;

import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "ai_assistance_logs")
public class AiAssistanceLog {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @Column(columnDefinition = "TEXT", nullable = false)
    private String question;
    
    @Column(columnDefinition = "TEXT")
    private String answer;
    
    @Column
    private boolean answered = false;
    
    @Column
    private String knowledgePoint;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
}