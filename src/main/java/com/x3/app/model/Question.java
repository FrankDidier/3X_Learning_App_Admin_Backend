package com.x3.app.model;

import lombok.Data;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "questions")
public class Question {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "quiz_id")
    private Quiz quiz;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private QuestionType type;
    
    @Column(nullable = false)
    private Course.Difficulty difficulty;
    
    @Column
    private String knowledgePoint;
    
    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<QuestionOption> options = new ArrayList<>();
    
    @Column(columnDefinition = "TEXT")
    private String correctAnswer; // For non-multiple choice questions
    
    @Column(columnDefinition = "TEXT")
    private String explanation;
    
    public enum QuestionType {
        MULTIPLE_CHOICE, SINGLE_CHOICE, TRUE_FALSE, FILL_BLANK, SHORT_ANSWER
    }
}