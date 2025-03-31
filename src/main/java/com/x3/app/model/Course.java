package com.x3.app.model;

import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import javax.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "courses")
public class Course {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Category category;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Level level;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;
    
    @Column(nullable = false)
    private String videoUrl;
    
    @Column
    private Integer durationMinutes;
    
    @Column
    private String thumbnailUrl;
    
    @ManyToOne
    @JoinColumn(name = "teacher_id")
    private User teacher;
    
    @CreationTimestamp
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    public enum Category {
        CATEGORY_1, CATEGORY_2, CATEGORY_3
    }
    
    public enum Level {
        LEVEL_1, LEVEL_2, LEVEL_3, LEVEL_4, LEVEL_5, 
        LEVEL_6, LEVEL_7, LEVEL_8, LEVEL_9, LEVEL_10
    }
    
    public enum Difficulty {
        BASIC, INTERMEDIATE, ADVANCED
    }
}