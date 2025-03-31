package com.x3.app.model;

import lombok.Data;

import javax.persistence.*;
import java.util.ArrayList;
import java.util.List;

@Data
@Entity
@Table(name = "course_sections")
public class CourseSection {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "course_id", nullable = false)
    private Course course;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String content;
    
    @Column
    private String videoSegmentUrl;
    
    @Column
    private Integer startTimeSeconds;
    
    @Column
    private Integer durationSeconds;
    
    @Column
    private Integer orderIndex;
    
    @OneToMany(mappedBy = "section", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserSectionProgress> userProgress = new ArrayList<>();
}