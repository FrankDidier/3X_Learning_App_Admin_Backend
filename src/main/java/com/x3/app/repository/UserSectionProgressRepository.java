package com.x3.app.repository;

import com.x3.app.model.CourseSection;
import com.x3.app.model.User;
import com.x3.app.model.UserSectionProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserSectionProgressRepository extends JpaRepository<UserSectionProgress, Long> {
    Optional<UserSectionProgress> findByUserAndSection(User user, CourseSection section);
    List<UserSectionProgress> findByUser(User user);
    
    @Query("SELECT usp FROM UserSectionProgress usp WHERE usp.user = ?1 AND usp.updatedAt < ?2 AND usp.completed = false")
    List<UserSectionProgress> findStagnantProgress(User user, LocalDateTime cutoffDate);
    
    @Query("SELECT COUNT(usp) FROM UserSectionProgress usp WHERE usp.user = ?1 AND usp.completed = true")
    Long countCompletedSectionsByUser(User user);
}