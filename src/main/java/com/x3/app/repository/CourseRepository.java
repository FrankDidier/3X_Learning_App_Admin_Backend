package com.x3.app.repository;

import com.x3.app.model.Course;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseRepository extends JpaRepository<Course, Long> {
    List<Course> findByCategory(Course.Category category);
    List<Course> findByLevel(Course.Level level);
    List<Course> findByDifficulty(Course.Difficulty difficulty);
    List<Course> findByCategoryAndLevel(Course.Category category, Course.Level level);
    List<Course> findByCategoryAndLevelAndDifficulty(Course.Category category, Course.Level level, Course.Difficulty difficulty);
    
    @Query("SELECT c FROM Course c WHERE c.category = ?1 AND c.level = ?2 AND c.difficulty = ?3 ORDER BY RAND() LIMIT ?4")
    List<Course> findRandomCourses(Course.Category category, Course.Level level, Course.Difficulty difficulty, int limit);
}