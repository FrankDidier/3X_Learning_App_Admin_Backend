package com.x3.app.model;

import lombok.Data;

import javax.persistence.*;

@Data
@Entity
@Table(name = "roles")
public class Role {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private ERole name;
    
    public enum ERole {
        ROLE_STUDENT,
        ROLE_LEADER,
        ROLE_TEACHER,
        ROLE_ADMIN
    }
}