package com.x3.app.model;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "user_answers")
public class UserAnswer {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "attempt_id", nullable = false)
    private UserQuizAttempt attempt;
    
    @ManyToOne
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;
    
    @Column(columnDefinition = "TEXT")
    private String userAnswer;
    
    @Column
    private boolean isCorrect = false;
    
    @Column
    private Integer timeSpentSeconds = 0;
}