package com.x3.app.model;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "question_options")
public class QuestionOption {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Column
    private boolean isCorrect = false;
    
    @Column
    private Integer orderIndex;
}